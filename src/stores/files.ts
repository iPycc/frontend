import { create } from 'zustand';
import { api } from '../api/client';
import i18n from '../i18n';

export interface FileItem {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  is_dir: boolean;
  size: number;
  policy_id: string | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface PathItem {
  id: string;
  name: string;
}

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  message?: string;
  multipart?: {
    key: string;
    uploadId: string;
    policyId: string;
  };
  speed: number; // bytes per second
  eta: number; // seconds
  loaded: number;
  total: number;
  startTime: number;
  lastLoaded: number;
  lastTime: number;
}

interface FilesState {
  files: FileItem[];
  path: PathItem[];
  currentFolderId: string | null;
  currentPolicyId: string | null;
  loading: boolean;
  error: string | null;
  uploads: UploadItem[];

  fetchFiles: (parentId?: string | null, policyId?: string | null) => Promise<void>;
  createDirectory: (name: string, parentId?: string | null, policyId?: string | null) => Promise<void>;
  uploadFile: (
    file: File,
    parentId?: string | null,
    policyId?: string | null
  ) => Promise<void>;
  uploadFileMultipart: (
    uploadId: string,
    file: File,
    parentId?: string | null,
    policyId?: string | null
  ) => Promise<void>;

  removeUpload: (id: string) => Promise<void>;
  clearCompletedUploads: () => void;
  
  renameFile: (id: string, name: string) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  downloadFile: (id: string, name: string) => Promise<void>;
}

export const useFilesStore = create<FilesState>((set, get) => ({
  files: [],
  path: [],
  currentFolderId: null,
  currentPolicyId: null,
  loading: false,
  error: null,
  uploads: [],

  fetchFiles: async (parentId?: string | null, policyId?: string | null) => {
    set({ loading: true, error: null, currentFolderId: parentId || null, currentPolicyId: policyId || null });
    try {
      const params: Record<string, string> = {};
      if (parentId) params.parent_id = parentId;
      if (policyId) params.policy_id = policyId;
      
      const response = await api.get('/files', { params });
      set({
        files: response.data.data.files,
        path: response.data.data.path,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createDirectory: async (name: string, parentId?: string | null, policyId?: string | null) => {
    const response = await api.post('/files', {
      name,
      parent_id: parentId || undefined,
      policy_id: policyId || undefined,
    });
    const newDir = response.data.data;
    set({ files: [...get().files, newDir] });
  },

  uploadFile: async (
    file: File,
    parentId?: string | null,
    policyId?: string | null
  ) => {
    const uploadId = Math.random().toString(36).substring(7);
    const newItem: UploadItem = {
        id: uploadId,
        file,
        progress: 0,
        status: 'pending',
        speed: 0,
        eta: 0,
        loaded: 0,
        total: file.size,
        startTime: Date.now(),
        lastLoaded: 0,
        lastTime: Date.now()
    };
    
    set({ uploads: [...get().uploads, newItem] });

    if (file.size > 500 * 1024 * 1024) {
         await get().uploadFileMultipart(uploadId, file, parentId, policyId);
         return;
    }

    try {
      set(state => ({
        uploads: state.uploads.map(u => u.id === uploadId ? { ...u, status: 'uploading' } : u)
      }));

      const formData = new FormData();
      formData.append('file', file);
      if (parentId) formData.append('parent_id', parentId);
      if (policyId) formData.append('policy_id', policyId);

      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return;
            
            const now = Date.now();
            const loaded = progressEvent.loaded;
            const total = progressEvent.total;
            
            set(state => {
                const upload = state.uploads.find(u => u.id === uploadId);
                if (!upload) return {};

                const timeDiff = (now - upload.lastTime) / 1000;
                let speed = upload.speed;
                let eta = upload.eta;

                // Update speed every 500ms
                if (timeDiff > 0.5) {
                    const bytesDiff = loaded - upload.lastLoaded;
                    speed = bytesDiff / timeDiff;
                    const remaining = total - loaded;
                    eta = speed > 0 ? remaining / speed : 0;
                    
                    return {
                        uploads: state.uploads.map(u => u.id === uploadId ? {
                            ...u,
                            progress: Math.round((loaded * 100) / total),
                            loaded,
                            speed,
                            eta,
                            lastLoaded: loaded,
                            lastTime: now
                        } : u)
                    };
                }

                return {
                     uploads: state.uploads.map(u => u.id === uploadId ? {
                        ...u,
                        progress: Math.round((loaded * 100) / total),
                        loaded,
                    } : u)
                };
            });
        },
      });

      const newFile = response.data.data;
      
      set(state => ({
          uploads: state.uploads.map(u => u.id === uploadId ? { ...u, status: 'completed', progress: 100 } : u)
      }));

      // Only add to file list if we are currently viewing the folder where it was uploaded
      const currentFolderId = get().currentFolderId;
      if (currentFolderId === parentId || (currentFolderId === null && !parentId)) {
           // Check if exists
           const existing = get().files.find((f) => f.id === newFile.id);
           if (existing) {
             set({
               files: get().files.map((f) => (f.id === newFile.id ? newFile : f)),
             });
           } else {
             set({ files: [...get().files, newFile] });
           }
      }
    } catch (error: any) {
        console.error("Upload error", error);
        set(state => ({
            uploads: state.uploads.map(u => u.id === uploadId ? { 
                ...u, 
                status: 'error', 
                error: error.message || 'Upload failed' 
            } : u)
        }));
    }
  },

  uploadFileMultipart: async (uploadId, file, parentId, policyId) => {
      const parseCosError = (text: string) => {
          const code = text.match(/<Code>([^<]+)<\/Code>/)?.[1]?.trim();
          const message = text.match(/<Message>([^<]+)<\/Message>/)?.[1]?.trim();
          if (code && message) return `${code}: ${message}`;
          return '';
      };

      try {
          set(state => ({
            uploads: state.uploads.map(u => u.id === uploadId ? { ...u, status: 'uploading', message: i18n.t('files.upload.initiating') } : u)
          }));

          const pathStr = get().path.map(p => p.name).join('/');
          
          const initRes = await api.post('/files/multipart/init', {
              path: pathStr,
              filename: file.name,
              size: file.size,
              parent_id: parentId,
              policy_id: policyId,
              mime_type: file.type
          });
          
          const { upload_id: cosUploadId, key, chunk_size, policy_id: usedPolicyId } = initRes.data.data;
          const chunkSize = chunk_size || 524288000;
          const totalParts = Math.ceil(file.size / chunkSize);
          const parts: { part_number: number, etag: string }[] = [];
          
          set(state => ({
            uploads: state.uploads.map(u => u.id === uploadId ? { 
                ...u, 
                multipart: { key, uploadId: cosUploadId, policyId: usedPolicyId },
            } : u)
          }));
          
          let uploadedBytes = 0;
          
          for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
              const start = (partNumber - 1) * chunkSize;
              const end = Math.min(start + chunkSize, file.size);
              const chunk = file.slice(start, end);
              
              set(state => ({
                uploads: state.uploads.map(u => u.id === uploadId ? { 
                    ...u, 
                    message: i18n.t('files.upload.uploading_part', { part: partNumber, total: totalParts }) 
                } : u)
              }));
              
              const signRes = await api.post('/files/multipart/sign', {
                  key,
                  upload_id: cosUploadId,
                  part_number: partNumber,
                  policy_id: usedPolicyId
              });
              
              const { url, authorization } = signRes.data.data;
              
              await new Promise<void>((resolve, reject) => {
                  const xhr = new XMLHttpRequest();
                  xhr.open('PUT', url);
                  xhr.setRequestHeader('Authorization', authorization);
                  
                  xhr.upload.onprogress = (e) => {
                      if (e.lengthComputable) {
                          const chunkLoaded = e.loaded;
                          const totalLoaded = uploadedBytes + chunkLoaded;
                          
                          const now = Date.now();
                          set(state => {
                              const upload = state.uploads.find(u => u.id === uploadId);
                              if (!upload) return {};
                              
                              const timeDiff = (now - upload.lastTime) / 1000;
                              let speed = upload.speed;
                              let eta = upload.eta;
                              
                              if (timeDiff > 0.5) {
                                  const bytesDiff = totalLoaded - upload.lastLoaded;
                                  speed = bytesDiff / timeDiff;
                                  const remaining = file.size - totalLoaded;
                                  eta = speed > 0 ? remaining / speed : 0;
                                  
                                  return {
                                      uploads: state.uploads.map(u => u.id === uploadId ? {
                                          ...u,
                                          progress: Math.round((totalLoaded * 100) / file.size),
                                          loaded: totalLoaded,
                                          speed,
                                          eta,
                                          lastLoaded: totalLoaded,
                                          lastTime: now
                                      } : u)
                                  };
                              }
                              return {
                                   uploads: state.uploads.map(u => u.id === uploadId ? {
                                      ...u,
                                      progress: Math.round((totalLoaded * 100) / file.size),
                                      loaded: totalLoaded,
                                  } : u)
                              };
                          });
                      }
                  };
                  
                  xhr.onload = () => {
                      if (xhr.status >= 200 && xhr.status < 300) {
                          const etag = xhr.getResponseHeader('ETag');
                          if (etag) {
                              parts.push({ part_number: partNumber, etag: etag.replace(/"/g, '') });
                              uploadedBytes += chunk.size;
                              resolve();
                          } else {
                              reject(new Error('No ETag in response'));
                          }
                      } else {
                          const raw = xhr.responseText ? parseCosError(xhr.responseText) : '';
                          const extra = raw ? `（${raw}）` : '';
                          reject(new Error(i18n.t('files.upload.upload_failed', { status: xhr.status, statusText: xhr.statusText, extra })));
                      }
                  };
                  
                  xhr.onerror = () => reject(new Error('Network error'));
                  xhr.send(chunk);
              });
          }
          
          set(state => ({
            uploads: state.uploads.map(u => u.id === uploadId ? { ...u, message: i18n.t('files.upload.completing') } : u)
          }));
          
          await api.post('/files/multipart/complete', {
              key,
              upload_id: cosUploadId,
              parts,
              parent_id: parentId,
              filename: file.name,
              size: file.size,
              mime_type: file.type,
              policy_id: usedPolicyId
          });
          
           get().fetchFiles(get().currentFolderId, get().currentPolicyId);

          set(state => ({
              uploads: state.uploads.map(u => u.id === uploadId ? { ...u, status: 'completed', progress: 100, message: i18n.t('common.completed') } : u)
          }));

      } catch (error: any) {
          console.error("Multipart upload error", error);
          const upload = get().uploads.find(u => u.id === uploadId);
          if (upload?.multipart) {
              try {
                  await api.post('/files/multipart/abort', {
                      key: upload.multipart.key,
                      upload_id: upload.multipart.uploadId,
                      policy_id: upload.multipart.policyId,
                  });
              } catch (_) {
              }
          }
           set(state => ({
            uploads: state.uploads.map(u => u.id === uploadId ? { 
                ...u, 
                status: 'error', 
                error: error.message || 'Upload failed' 
            } : u)
        }));
      }
  },
  
  removeUpload: async (id: string) => {
      const upload = get().uploads.find(u => u.id === id);
      if (upload?.multipart) {
          try {
              await api.post('/files/multipart/abort', {
                  key: upload.multipart.key,
                  upload_id: upload.multipart.uploadId,
                  policy_id: upload.multipart.policyId,
              });
          } catch (_) {
          }
      }
      set(state => ({ uploads: state.uploads.filter(u => u.id !== id) }));
  },

  clearCompletedUploads: () => {
      set(state => ({ uploads: state.uploads.filter(u => u.status !== 'completed') }));
  },

  renameFile: async (id: string, name: string) => {
    const response = await api.patch(`/files/${id}`, { name });
    const updatedFile = response.data.data;
    set({
      files: get().files.map((f) => (f.id === id ? updatedFile : f)),
    });
  },

  deleteFile: async (id: string) => {
    await api.delete(`/files/${id}`);
    set({ files: get().files.filter((f) => f.id !== id) });
  },

  downloadFile: async (id: string, name: string) => {
    const response = await api.get(`/files/${id}/download`, {
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
}));

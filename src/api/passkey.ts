import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/types';
import { api } from './client';

type ApiResponse<T> = { code: number; message: string; data: T };

function unwrapPublicKey<T extends object>(options: any): T {
  if (options && typeof options === 'object' && 'publicKey' in options) {
    return (options as any).publicKey as T;
  }
  return options as T;
}

export async function registerPasskey(nickname?: string) {
  const begin = await api.post<ApiResponse<{ challenge_id: string; options: PublicKeyCredentialCreationOptionsJSON }>>(
    '/auth/webauthn/register/begin',
    {}
  );

  const { challenge_id } = begin.data.data;
  const options = unwrapPublicKey<PublicKeyCredentialCreationOptionsJSON>(begin.data.data.options as any);
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const rpId = options?.rp?.id || '';
  if (hostname && rpId && hostname !== rpId && !hostname.endsWith(`.${rpId}`)) {
    const err = new Error(`RP_ID_MISMATCH:${hostname}:${rpId}`);
    err.name = 'RP_ID_MISMATCH';
    throw err;
  }
  const credential: RegistrationResponseJSON = await startRegistration({ optionsJSON: options });

  const finish = await api.post<ApiResponse<{ passkey_id: string }>>('/auth/webauthn/register/finish', {
    challenge_id,
    credential,
    nickname,
  });

  return finish.data.data;
}

export async function beginPasskeyLogin(email?: string) {
  const begin = await api.post<ApiResponse<{ challenge_id: string; options: PublicKeyCredentialRequestOptionsJSON }>>(
    '/auth/webauthn/authenticate/begin',
    email ? { email } : {}
  );
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const options = unwrapPublicKey<PublicKeyCredentialRequestOptionsJSON>(begin.data.data.options as any);
  const rpId = options?.rpId || '';
  if (hostname && rpId && hostname !== rpId && !hostname.endsWith(`.${rpId}`)) {
    const err = new Error(`RP_ID_MISMATCH:${hostname}:${rpId}`);
    err.name = 'RP_ID_MISMATCH';
    throw err;
  }
  return { challenge_id: begin.data.data.challenge_id, options };
}

export async function finishPasskeyLogin(challengeId: string, options: PublicKeyCredentialRequestOptionsJSON) {
  const unwrapped = unwrapPublicKey<PublicKeyCredentialRequestOptionsJSON>(options as any);
  const credential: AuthenticationResponseJSON = await startAuthentication({ optionsJSON: unwrapped });
  const finish = await api.post('/auth/webauthn/authenticate/finish', {
    challenge_id: challengeId,
    credential,
  });
  return finish.data.data;
}

export async function beginPasskeyReauth() {
  const begin = await api.post<ApiResponse<{ challenge_id: string; options: PublicKeyCredentialRequestOptionsJSON }>>(
    '/user/reauth/passkey/begin',
    {}
  );
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const options = unwrapPublicKey<PublicKeyCredentialRequestOptionsJSON>(begin.data.data.options as any);
  const rpId = options?.rpId || '';
  if (hostname && rpId && hostname !== rpId && !hostname.endsWith(`.${rpId}`)) {
    const err = new Error(`RP_ID_MISMATCH:${hostname}:${rpId}`);
    err.name = 'RP_ID_MISMATCH';
    throw err;
  }
  return { challenge_id: begin.data.data.challenge_id, options };
}

export async function finishPasskeyReauth(challengeId: string, options: PublicKeyCredentialRequestOptionsJSON) {
  const unwrapped = unwrapPublicKey<PublicKeyCredentialRequestOptionsJSON>(options as any);
  const credential: AuthenticationResponseJSON = await startAuthentication({ optionsJSON: unwrapped });
  const finish = await api.post<ApiResponse<{ reauth_token: string }>>('/user/reauth/passkey/finish', {
    challenge_id: challengeId,
    credential,
  });
  return finish.data.data;
}

export async function listPasskeys() {
  const resp = await api.get<ApiResponse<Array<{ id: string; nickname?: string | null; device_info?: string | null; created_at: string; last_used_at?: string | null }>>>(
    '/user/passkeys'
  );
  return resp.data.data;
}

export async function deletePasskey(id: string) {
  await api.delete(`/user/passkeys/${encodeURIComponent(id)}`);
}

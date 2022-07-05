/* eslint-disable import/export */
import { useCallback, useEffect, useRef } from 'react';

import { useGoogleOAuth } from '../GoogleOAuthProvider';
import {
  TokenClientConfig,
  TokenResponse,
  CodeClientConfig,
  CodeResponse,
  OverridableTokenClientConfig,
} from '../types';

type TokenResponseWithUserData = TokenResponse & {
  email?: string;
  family_name?: string;
  given_name?: string;
  id?: string;
  locale?: string;
  name?: string;
  picture?: string;
  verified_email?: boolean;
};

interface ImplicitFlowOptions
  extends Omit<TokenClientConfig, 'client_id' | 'scope' | 'callback'> {
  onSuccess?: (
    tokenResponse: Omit<
      TokenResponseWithUserData,
      'error' | 'error_description' | 'error_uri'
    >,
  ) => void;
  onError?: (
    errorResponse: Pick<
      TokenResponse,
      'error' | 'error_description' | 'error_uri'
    >,
  ) => void;
  scope?: TokenClientConfig['scope'];
}

interface AuthCodeFlowOptions
  extends Omit<CodeClientConfig, 'client_id' | 'scope' | 'callback'> {
  onSuccess?: (
    codeResponse: Omit<
      CodeResponse,
      'error' | 'error_description' | 'error_uri'
    >,
  ) => void;
  onError?: (
    errorResponse: Pick<
      CodeResponse,
      'error' | 'error_description' | 'error_uri'
    >,
  ) => void;
  scope?: CodeResponse['scope'];
}

type UseGoogleLoginOptionsImplicitFlow = {
  flow?: 'implicit';
} & ImplicitFlowOptions;

type UseGoogleLoginOptionsAuthCodeFlow = {
  flow?: 'auth-code';
} & AuthCodeFlowOptions;

type UseGoogleLoginOptions =
  | UseGoogleLoginOptionsImplicitFlow
  | UseGoogleLoginOptionsAuthCodeFlow;

export default function useGoogleLogin(
  options: UseGoogleLoginOptionsImplicitFlow,
): (overrideConfig?: OverridableTokenClientConfig) => void;
export default function useGoogleLogin(
  options: UseGoogleLoginOptionsAuthCodeFlow,
): () => void;

export default function useGoogleLogin({
  scope = '',
  onSuccess,
  onError,
  ...props
}: UseGoogleLoginOptions): unknown {
  const { clientId, scriptLoadedSuccessfully } = useGoogleOAuth();
  const clientRef = useRef<any>();

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!scriptLoadedSuccessfully) return;

    const clientMethod = 'initTokenClient';
    // const clientMethod =
    //   flow === 'implicit' ? 'initTokenClient' : 'initCodeClient';

    const client = window.google?.accounts.oauth2[clientMethod]({
      client_id: clientId,
      scope: `openid profile email https://www.googleapis.com/auth/userinfo.profile ${scope}`,
      callback: (response: TokenResponse) => {
        fetch(
          `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${response.access_token}`,
        )
          .then(res => res.json())
          .then(res => {
            onSuccessRef.current?.({
              ...res,
              ...response,
            });
          });
      },
      ...props,
    });
    clientRef.current = client;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, scriptLoadedSuccessfully, scope]);

  const loginImplicitFlow = useCallback(
    (overrideConfig?: OverridableTokenClientConfig) =>
      clientRef.current?.requestAccessToken(overrideConfig),
    [],
  );

  const loginAuthCodeFlow = useCallback(
    () => clientRef.current.requestCode(),
    [],
  );

  return loginImplicitFlow;
}

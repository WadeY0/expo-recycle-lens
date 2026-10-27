import { registerAs } from '@nestjs/config';
import { EConfigKeys } from '../../common/types/config-keys';

const GoogleOAuthConfig = registerAs(EConfigKeys.GoogleOAuth, () => ({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackUrl: process.env.GOOGLE_CALLBACK_URL,
}));

export default GoogleOAuthConfig;

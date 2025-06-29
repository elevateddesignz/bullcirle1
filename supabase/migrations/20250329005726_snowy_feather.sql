/*
  # Add WebAuthn Support

  1. New Tables
    - `webauthn_credentials`
      - Store user credentials for biometric authentication
    - `webauthn_challenges`
      - Store temporary challenges for registration/authentication

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create webauthn_credentials table
CREATE TABLE webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id bytea NOT NULL,
  public_key bytea NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create webauthn_challenges table
CREATE TABLE webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge text NOT NULL,
  type text NOT NULL CHECK (type IN ('registration', 'authentication')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '5 minutes')
);

-- Enable RLS
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- Create policies for webauthn_credentials
CREATE POLICY "Users can view their own credentials"
  ON webauthn_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credentials"
  ON webauthn_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policies for webauthn_challenges
CREATE POLICY "Users can view their own challenges"
  ON webauthn_challenges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own challenges"
  ON webauthn_challenges
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to clean up expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS trigger AS $$
BEGIN
  DELETE FROM webauthn_challenges
  WHERE expires_at < now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to clean up expired challenges
CREATE TRIGGER cleanup_expired_challenges
  AFTER INSERT ON webauthn_challenges
  EXECUTE FUNCTION cleanup_expired_challenges();
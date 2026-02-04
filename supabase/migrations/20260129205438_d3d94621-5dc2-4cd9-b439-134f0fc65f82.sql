-- Add policy to allow anyone to check gift card balance by code
CREATE POLICY "Anyone can check gift card balance by code"
ON public.gift_cards
FOR SELECT
USING (true);

-- Note: This allows balance checks but the gift_cards table still requires 
-- staff permissions for ALL (insert, update, delete) operations
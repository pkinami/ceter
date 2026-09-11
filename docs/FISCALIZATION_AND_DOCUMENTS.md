# Fiscalization And Documents

## eTIMS

Ceter's eTIMS implementation is provider-neutral until legitimate onboarding, credentials, branch/pay-point/device identifiers and certification evidence are available.

Official KRA references previously consulted:

- `https://www.kra.go.ke/business/etims-electronic-tax-invoice-management-system/learn-about-etims/etims-system-to-system-integration`
- `https://www.kra.go.ke/helping-tax-payers/faqs/learn-about-etims`
- `https://www.kra.go.ke/component/kra_faq/faq/424`
- `https://www.kra.go.ke/component/kra_faq/faq/433`
- `https://www.kra.go.ke/individual/filing-paying/types-of-taxes/value-added-tax`

Implementation safeguards:

- Invoice fiscalization jobs use idempotency keys.
- Accepted records cannot be retried or duplicated.
- Product tax/eTIMS mappings are required before submission.
- Disabled/manual mode cannot submit live invoices.
- Sandbox mode without credentials validates locally but does not claim KRA acceptance or generate KRA QR data.
- Browser-displayed requests and responses are redacted.
- Official KRA QR data appears only when official provider data exists.

Provider modes include OSCU, VSCU, legacy TIMS/ETR metadata, sandbox and disabled/manual fallback.

## Document Trust

Document lifecycle states include draft, under review, approved, fiscalization required, fiscalized, finalized, digitally signed, issued, superseded, cancelled and revoked.

Implemented foundation:

- Documents store lifecycle, signature, verification, version, token hash, content hashes, signing certificate metadata, supersession, issue and revocation metadata.
- Signing certificate metadata can be recorded without storing private keys.
- Public verification is available at `/verify/[token]`.
- Public verification stores only a hash of the token, logs verification events and reveals safe metadata.
- Operational barcodes support identifiers such as invoice, sales-order and delivery-note numbers.
- Delivery and service documents can link to their source records.

Public verification must not expose private customer contact details, addresses, tax PINs, full line items, credentials or internal notes.

## Signing

Production signing remains disabled until a legitimate organizational certificate and protected key environment are configured. Test signing is development-only. Documents must not be marked digitally signed until cryptographic signing and post-signature validation are configured.

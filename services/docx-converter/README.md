# Ceter DOCX converter

This is the private LibreOffice service called by the Vercel application. It is
not deployable to Vercel. Run it on a Ceter-controlled container host behind an
HTTPS reverse proxy and allow inbound traffic only from the Vercel application.

Set a random `DOCX_CONVERTER_TOKEN` (32+ characters) in the host secret store.
Mount Ceter's licensed `Arial`, `Calibri`, `Courier New`, `Symbol`, and
`Wingdings` font files through `CETER_FONT_DIR`; they must not be committed or
replaced with lookalikes. The service refuses to start if exact font matching
fails, gives each request a new temporary directory, limits request size and
concurrency, kills stalled LibreOffice processes, validates embedded output
fonts, and removes temporary files in all cases.

At the reverse proxy, terminate TLS and forward only `POST /convert` and
`GET /healthz`. Do not log request bodies or authorization headers. Configure
the Vercel secrets only after this check succeeds:

```sh
curl -fsS https://converter.example/healthz
curl -fsS -H "Authorization: Bearer $DOCX_CONVERTER_TOKEN" \
  -H "Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
  --data-binary @sample.docx https://converter.example/convert > sample.pdf
pdffonts sample.pdf
```

# Testing

Run the core validation suite before deployment or large merges:

```bash
npm run lint
npx tsc --noEmit
npx prisma validate
npx prisma generate
npm run build
```

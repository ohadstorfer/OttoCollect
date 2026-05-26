# Project Conventions

## Title text must be wrapped in a `<span>`

Every time there is a title text element (`h1`–`h6`, or a title component such as
`CardTitle`, `DialogTitle`, etc.), the text content **must** be wrapped in a `<span>`.

Examples:

```tsx
<CardTitle><span>{t('stampsManagement.cardTitles.frontSignatures')}</span></CardTitle>

<h2 className="text-lg font-bold mb-2"><span>{t('userManagement.dialogs.blockUser.title')}</span></h2>
```

This applies to both translated strings (`t(...)`), variables, and literal text.

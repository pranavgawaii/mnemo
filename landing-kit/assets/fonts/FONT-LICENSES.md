# Font licences

Both typefaces in this kit are free for personal and commercial use under the
**SIL Open Font License 1.1**. Keep the notices below with the font files if you
redistribute the kit.

---

## Outfit

- **Designers:** Smartsheet Inc, Rodrigo Fuenzalida
- **Source:** [Google Fonts — Outfit](https://fonts.google.com/specimen/Outfit)
- **Repository:** [Outfitio/Outfit-Fonts](https://github.com/Outfitio/Outfit-Fonts)
- **Copyright:** Copyright 2021 The Outfit Project Authors
  (https://github.com/Outfitio/Outfit-Fonts)
- **Licence:** SIL Open Font License 1.1
- **File in this kit:** `Outfit-Variable.woff2` (latin subset, weight 100–900)

Outfit is the default sans. It is also available through `next/font/google`, in
which case Next.js fetches and self-hosts it at build time.

---

## Redaction 35

- **Designers:** Jeremy Mickel / Forest Young
- **Source:** [MCKL Type — Redaction](https://www.mckltype.com/typefaces/redaction)
- **Project:** [redaction.us](https://www.redaction.us/)
- **Copyright:** Copyright 2019 MCKL. All Rights Reserved.
- **Licence:** SIL Open Font License 1.1
- **Files in this kit:** `Redaction35-Regular.otf`, `Redaction35-Italic.otf`

Redaction is a 21-cut family across seven degradation grades. This kit uses
**grade 35**, Regular and Italic only. The full family is available from MCKL.

The font's name table states:

> This Font Software is licensed under the SIL Open Font License, Version 1.1.
> This license is available with a FAQ at: http://scripts.sil.org/OFL

---

## What the OFL allows

- Use in personal and commercial projects.
- Embed in websites and applications.
- Modify and redistribute, including as part of a larger work.
- Bundle with software that is sold.

## What it does not allow

- Selling the font files on their own.
- Releasing a modified version under a different licence.
- Using the Reserved Font Name for a modified version without permission.
- Using the designers' names to endorse a modified version.

The full licence text is in [`LICENSE-OFL-1.1.txt`](./LICENSE-OFL-1.1.txt).

---

## Attribution in the product

You do **not** need a visible "font by" credit on the page. The licence requires
the copyright and licence notice to travel with the font files, not to appear in
the UI. A line in the project's licence/credits file is enough.

If you want to credit them anyway:

```text
Typefaces: Outfit by Smartsheet Inc / Rodrigo Fuenzalida (SIL OFL 1.1);
Redaction 35 by Jeremy Mickel / Forest Young, MCKL (SIL OFL 1.1).
```

---

## If you replace the fonts

The design depends on the pairing, not on these exact files. If the project
cannot use Redaction, the closest Google Fonts substitutes are:

| Substitute | Why |
|---|---|
| Instrument Serif Italic | High contrast, narrow, very close in spirit |
| Newsreader Italic | Editorial, slightly warmer |
| Source Serif 4 Italic | Neutral, safe for longer text |
| Playfair Display Italic | More decorative; use with care |

Update `--font-redaction` (or its equivalent) and keep the `112%` optical bump.
The rest of the system does not change.

---

## Verification

The font metadata was read from the shipped files:

- `Redaction35-Regular.otf` / `Italic.otf`: version 2.001, MCKL, OFL 1.1.
- `Outfit-Variable.woff2`: downloaded from Google Fonts, variable weight
  100–900, latin subset, OFL 1.1.

If you need the absolute latest licence text, use the links above rather than
this summary.

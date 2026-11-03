# Contract: Die Look and Share Metadata

## Ludo die (CSS only)

| Aspect | Rule |
|--------|------|
| Body | Bright white (`#ffffff` to about `#e6ebf3`), glossy: a soft upper-left specular highlight on every face, gentle cool shading toward edges |
| Corners and edges | Visibly rounder than before: slab radii about 32%, 40% and 48% (previously 24%, 30%, 38%), same three-slab bevel |
| Pips | Dark glossy pips with at least 7:1 contrast against the face on all six faces |
| States | Idle, hover, tumbling, settled, disabled, reduced motion all keep the white gloss; disabled keeps its current dimming |
| Unchanged | Die size (`--die`), cube transforms, tumble animation and timing, tap/space/button controls, displayed result |
| Cost | No new DOM nodes, no new animation, no new images |

## Share metadata (`client/index.html`)

```html
<title>myArena Hub</title>
<meta name="description" content="Play interactive games with your Friends and Family" />
<meta property="og:site_name" content="myArena Hub" />
<meta property="og:type" content="website" />
<meta property="og:title" content="myArena Hub" />
<meta property="og:description" content="Play interactive games with your Friends and Family" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="myArena Hub" />
<meta name="twitter:description" content="Play interactive games with your Friends and Family" />
```

- The text MUST NOT mention Ludo or private rooms.
- The same HTML is served for the Hub and every `/room/{gameId}/{roomId}` URL, so room invites show the same preview.
- Previews are read from the served HTML (no JavaScript), so the built `client/dist/index.html` is what is verified.

# website-taciturn

The website for [taciturn](https://github.com/forkcloser/taciturn), an ssh-agent for keys in
the Mac's Secure Enclave. One page, static, no build step, served at
https://taciturn.forkcloser.org/.

## Layout

| Path | What |
|------|------|
| `site/` | The site as served. `forkcloser.css` and `forkcloser.js` are the shared Forkcloser identity (tokens, chrome, light and dark themes, the theme switch), copied from website-godolint until it is split out; `style.css` is what is particular to taciturn. No build step, no web fonts, no third-party requests. |
| `site/_headers` | Read by Cloudflare Pages: the response headers, a same-origin Content-Security-Policy, HSTS, and friends. |
| `pins.yaml` | The taciturn release the page is written against, pinned by its attested digest. Renovate moves the version; the tests below hold the page to it. |
| `docs/copy.md` | The page's text with the source of every claim: a file in forkcloser/taciturn at the pinned version, a usage line, or a URL. The page is set from it; a claim changes there first. |

## Working on it

Open `site/index.html` in a browser; the page is a plain file and needs no server.

```bash
just lint    # the shared limen baseline: limen, just, aqua, yaml, shell, dockerfile, commits
just test    # external: fail if any page loads a resource from another host
             # csp: fail if the CSP hash in _headers is not the hash of the page's inline snippet
             # pin: fail if a version on the page is not the one pins.yaml pins
             # help: on macOS, run the pinned release and fail if the page names a command it lacks
```

When Renovate bumps `pins.yaml`, `just test` fails until every version on the page follows,
and the macOS leg checks the commands the page shows against the new release's usage.

## Publishing

The site is deployed by Cloudflare Pages from this repository: a push to `main` deploys
`site/` as committed, and every other branch gets a preview at
`<branch>.website-taciturn.pages.dev`. There is no build step and no deploy workflow here.
The Pages project, the custom domain and the DNS record are declared in
[forkcloser/infra](https://github.com/forkcloser/infra), not configured by hand.

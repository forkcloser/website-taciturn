# website-taciturn

The website for [taciturn](https://github.com/forkcloser/taciturn), an ssh-agent for keys in
the Mac's Secure Enclave. Static, no build step, served at https://taciturn.forkcloser.org/.

## Layout

| Path | What |
|------|------|
| `site/` | The site as served. No build step, no web fonts, no third-party requests. |
| `site/_headers` | Read by Cloudflare Pages: the response headers, a same-origin Content-Security-Policy, HSTS, and friends. |

## Working on it

Open `site/index.html` in a browser; the pages are plain files and need no server.

```bash
just lint    # the shared limen baseline: limen, just, aqua, yaml, shell, dockerfile, commits
just test    # external: fail if any page loads a resource from another host
```

## Publishing

The site is deployed by Cloudflare Pages from this repository: a push to `main` deploys
`site/` as committed, and every other branch gets a preview at
`<branch>.website-taciturn.pages.dev`. There is no build step and no deploy workflow here.
The Pages project, the custom domain and the DNS record are declared in
[forkcloser/infra](https://github.com/forkcloser/infra), not configured by hand.

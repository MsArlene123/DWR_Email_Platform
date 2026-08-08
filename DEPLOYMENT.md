# Deploying the DWR Email Dashboard to the DigitalOcean Droplet

Target address: **https://dwremail.online**
Droplet: ubuntu-s-1-bankruptcy-forum (1 vCPU, 2 GB RAM, 70 GB disk)

The design in one sentence: GitHub builds the app every time code is
pushed (the industrial kitchen), and the droplet only downloads the
finished package and serves it (the storefront), so the existing sites
on the droplet are never disturbed by heavy compiling.

---

## Phase 1: The DNS record (2 minutes, in the registrar panel)

In the DNS settings for **docwritereview.work** (Hostinger hPanel or
Namecheap, wherever the domain's DNS is managed), add one record:

- Type: **A**
- Name/Host: **email**
- Value/Points to: *the droplet's public IP address*
- TTL: default is fine

This is the directory entry that says "the room called email is at
this building's street address." It can take up to an hour to spread,
usually minutes.

## Phase 2: One-time droplet setup (10 minutes, DigitalOcean console)

From the droplet console, as root:

```bash
cd /root
git clone https://github.com/MsArlene123/DWR_Email_Platform.git dwr-email-src
# (private repo: username MsArlene123, password = the GitHub token)
bash dwr-email-src/deploy/setup-droplet.sh
```

The script prints its work as it goes: swap file, Node 22, PostgreSQL
with a new database and a generated password (it prints the
DATABASE_URL to copy), app folders, the background service, the nginx
site, and the nightly 3:15 AM database backup. It is safe to run twice.

## Phase 3: Fill in the environment file

```bash
nano /var/www/dwr-email/shared/.env
```

- **DATABASE_URL**: paste the line the setup script printed.
- **NEXTAUTH_URL**: already set to https://dwremail.online
- **NEXTAUTH_SECRET**: reuse the value from the Abacus .env, so
  existing logins keep working.
- **CRON_SECRET**: reuse the Abacus value.
- **ENCRYPTION_KEY**: reuse the Abacus value. This gives any password
  sealed with that key a chance to decrypt. Whatever does not decrypt
  will be named plainly by the health check, and re-entering it takes
  a minute per account.

Then store a GitHub token (read access to this repo is enough) so the
droplet can download build packages:

```bash
nano /var/www/dwr-email/shared/github_token   # paste token, save
chmod 600 /var/www/dwr-email/shared/github_token
```

## Phase 4: HTTPS certificate (after DNS is live)

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d dwremail.online
```

Free certificate, renews itself automatically.

## Phase 5: First deploy

```bash
bash /root/dwr-email-src/deploy/deploy.sh
```

Downloads the latest package GitHub built, creates the database
tables, switches the "current" pointer, and starts the service.
Every future deploy is this same single command. Rollback, if ever
needed, is pointing "current" back at the previous release folder.

## Phase 6: The heartbeat

Once HTTPS works and the site loads, give the email queue its pulse.
As root, run `crontab -e` and add (with the real CRON_SECRET):

```
*/2 * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://dwremail.online/api/process-all >/dev/null
```

Every 2 minutes, not 15: campaigns send one email per account per
pass, so a 2 minute pulse is what lets a "1 email every 3 minutes"
sending rate actually keep that pace.

## Phase 7: Moving the data from Abacus

From any machine that can reach the old Abacus database (the droplet
usually can):

```bash
pg_dump "OLD_ABACUS_DATABASE_URL" > abacus_export.sql
sudo -u postgres psql dwr_email < abacus_export.sql
```

This carries over accounts, templates, campaigns, drip sequences,
contact lists, and history. If the old database is unreachable from
outside Abacus, the fallback is re-creating accounts and re-importing
sheets, which the dashboard supports natively.

## Phase 8: Prove the fleet is healthy

Log in at https://dwremail.online, open **Accounts**, and
press **Check All Accounts**. Every account reports either "Login
succeeded, this account can send" or the exact reason it cannot.
Re-enter any password the report flags. Green fleet, then campaigns.

---

## Phase 9: Set up image uploads (DigitalOcean Spaces)

Image uploads (logos, QR codes, banners) need an external object
storage bucket. The app supports both AWS S3 and DigitalOcean Spaces;
on a DigitalOcean droplet, Spaces is the natural choice because it
lives in the same region and there are no egress fees between your
droplet and a Space in the same datacenter.

> **How uploads work (and why this matters):** The browser sends the
> file to your Next.js server via `/api/upload/server-side`, which then
> uploads it to Spaces using the AWS SDK. This means the browser only
> ever talks to your own origin — **no CORS configuration on the Space
> is required**. (The older `/api/upload/presigned` direct-to-Space
> flow is kept as a fallback; if you ever want to use it for large
> files, see `deploy/configure-spaces-cors.sh`.)

### 9a. Create a Space

1. Go to <https://cloud.digitalocean.com/spaces> and click **Create Space**.
2. Name it (lowercase, no dots), e.g. `dwr-email-assets`.
3. Pick the same region as your droplet (e.g. **nyc3**) to avoid
   cross-region bandwidth charges.
4. Set it to **Restrict file listing** (private) — the app marks
   uploaded images as public-read at the object level anyway, so
   you don't need the whole bucket listable.
5. Click **Create**.

### 9b. Generate Spaces access keys

1. Go to <https://cloud.digitalocean.com/spaces/settings> (Settings tab on the Spaces page).
2. Click **Generate New Key** under **Spaces access keys**.
3. Give it a name like `dwr-email-app`.
4. Copy the **Access Key ID** and **Secret Access Key** immediately —
   the secret is only shown once.

### 9c. Fill in the env file

```bash
nano /var/www/dwr-email/shared/.env
```

Add or update these lines (using your real Space name, region, and keys):

```
AWS_REGION=nyc3
AWS_BUCKET_NAME=dwr-email-assets
AWS_FOLDER_PREFIX=
AWS_ENDPOINT=https://nyc3.digitaloceanspaces.com
AWS_ACCESS_KEY_ID=PASTE_YOUR_ACCESS_KEY_HERE
AWS_SECRET_ACCESS_KEY=PASTE_YOUR_SECRET_KEY_HERE
```

Notes:
- `AWS_REGION` must match the region in your `AWS_ENDPOINT` URL.
- `AWS_FOLDER_PREFIX` is optional — leave blank for no prefix, or
  set e.g. `prod/` to put every uploaded file under a `prod/` folder.
- `AWS_ENDPOINT` is what tells the app to use Spaces instead of
  native AWS S3. Leave it blank only if you are actually using AWS S3.

### 9d. Restart and verify

```bash
systemctl restart dwr-email
```

Then **while signed in to the dashboard**, visit this URL in your
browser:

```
https://dwremail.online/api/upload/diagnostics
```

It returns a JSON report with five checks:
1. **env** — are all required vars present?
2. **client** — can the S3Client be constructed?
3. **bucket** — is the bucket reachable and the credentials valid?
4. **presign** — can a presigned PUT URL be generated?
5. **testPut** — can the server actually write a test object to the
   bucket? (This is the only check that proves the credentials have
   **write** permission, not just read.)

All five should say `"ok": true`. If any says `"ok": false`, the
`detail` field tells you exactly which setting to fix. The most common
failure is `testPut` returning false — that means the Spaces access
key was generated with read-only permissions. Regenerate the key at
<https://cloud.digitalocean.com/spaces/settings> with full read/write
access.

### 9e. Test in the UI

1. Go to **Dashboard → Images** in the app.
2. Click **Upload Image** and pick a logo PNG (under 10 MB).
3. You should see a green "uploaded!" toast and the image should
   appear in the library grid with a **Copy URL** button.
4. Click **Copy URL**, paste it into a new browser tab, and the
   image should load. If it does not load, the Space's permission
   policy is likely the issue — confirm the Space was created with
   file-listing restricted (the app sets public-read ACL on each
   object, so the bucket itself does not need to be listable).

### 9f. (Optional) Configure CORS for direct uploads

If you ever want to switch from the server-side upload path to the
direct-to-Space presigned-URL flow (faster for very large files), you
need to configure CORS on the Space. The `deploy/configure-spaces-cors.sh`
script does this for you:

```bash
bash /root/dwr-email-src/deploy/configure-spaces-cors.sh
```

It will prompt for your Space name, region, access keys, and the app
origin URL (e.g. `https://dwremail.online`). After it runs, browser
PUTs to your Space from the specified origin will work without CORS
errors. **You do not need to do this for normal operation** — the
default server-side upload path bypasses CORS entirely.

---

## Day-to-day afterward

- Code change → push to GitHub → wait ~2 minutes for the build →
  run `deploy.sh` on the droplet. Done.
- Backups: /var/backups/dwr-email, 14 days kept, nightly at 3:15 AM.
- Logs: `journalctl -u dwr-email -f`
- Service control: `systemctl restart|status dwr-email`

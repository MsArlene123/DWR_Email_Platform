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

## Day-to-day afterward

- Code change → push to GitHub → wait ~2 minutes for the build →
  run `deploy.sh` on the droplet. Done.
- Backups: /var/backups/dwr-email, 14 days kept, nightly at 3:15 AM.
- Logs: `journalctl -u dwr-email -f`
- Service control: `systemctl restart|status dwr-email`

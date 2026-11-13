# Start here: launching your site, step by step

This guide is for competition owners who are not developers. You will work with an AI coding assistant (for example
Claude Code) that runs **on your own computer**. It reads this guide and the rules in [AGENTS.md](../AGENTS.md), asks
you questions, changes the code and runs the deploy for you.

Three rules keep you safe:

1. **Never give the assistant a private key, a password or a live API secret.** Not in the chat, not in a file it
   can read, not in the repository. It does not need them: it uses your SSH key through your computer's key agent
   without ever seeing it, and you type secrets straight into the server yourself (step 8).
2. **The assistant asks before every step that changes your server**, and you say yes or no. If it does not ask,
   tell it to stop.
3. **Use test mode until launch.** Stripe test keys and test payments only, until the site has been checked.

The first time you open the project, the assistant runs a short **setup interview** (described in AGENTS.md) and
records your answers in `config/site.json`. That file holds only non-secret details, such as your company name and
support email.

## 1. What you need before you start

- **A domain name**, for example `competitions.example.co.uk`, with access to its DNS settings.
- **Your company details exactly as Companies House shows them:** registered name, company number and registered
  office address. FairDraw checks that these match.
- **Your ICO registration number** (the data protection fee).
- **A payment provider account.** Start with Stripe in test mode. Many acquirers, Stripe included, refuse or later
  close prize-competition merchants, so get written approval before you rely on one. Read [payments.md](payments.md).
- **A transactional email provider** that sends from the UK or EU, for example Postmark, Brevo or Amazon SES (London
  region). Check their current pricing yourself.
- **Your first prize**, the **postal address for free entries**, and a **support email address** that you read.
- **A host** for the server: see [hosting.md](hosting.md).

## 2. Create a deploy SSH key on your own computer

An SSH key is a pair of files: a **private key**, which never leaves your computer, and a **public key** (ending in
`.pub`), which you give to the host. Replace `mysite` with a short name for your site. Choose a passphrase when asked
and keep it in your password manager.

**Windows** (PowerShell, using the OpenSSH built into Windows):

```powershell
ssh-keygen -t ed25519 -C "deploy-mysite" -f $HOME\.ssh\mysite_deploy
```

**macOS and Linux** (Terminal):

```sh
ssh-keygen -t ed25519 -C "deploy-mysite" -f ~/.ssh/mysite_deploy
```

This makes `mysite_deploy` (private, keep it secret) and `mysite_deploy.pub` (public, safe to share).

### Load the key into your key agent

The agent holds the unlocked key in memory, so the assistant (and the deploy script) can use it without reading it.

**Windows**, in a PowerShell window opened with "Run as administrator" (once):

```powershell
Get-Service ssh-agent | Set-Service -StartupType Automatic; Start-Service ssh-agent
```

Then, in a normal PowerShell window:

```powershell
ssh-add $HOME\.ssh\mysite_deploy
```

**macOS:**

```sh
ssh-add --apple-use-keychain ~/.ssh/mysite_deploy
```

**Linux:**

```sh
eval "$(ssh-agent -s)"; ssh-add ~/.ssh/mysite_deploy
```

### Keep the private key private

- Upload **only** the `.pub` file to your host's dashboard.
- **Never** paste the private key into a chatbot, a website, a chat window, an email or the repository. Nobody
  legitimate will ask for it.
- The repository's `.gitignore` already ignores key files (`*.pem`, `id_*`, `*_deploy`), so a key cannot be committed
  by accident. Keep your keys in `~/.ssh`, outside the project folder, anyway.

## 3. Create the server

Follow [hosting.md](hosting.md): Ubuntu LTS, at least 2 GB RAM, a UK or EU region, and your `mysite_deploy.pub` key
added when you create it. Write down the server's IP address.

## 4. Point your domain at the server

In your domain's DNS settings, add:

- an **A record** for your domain (for example `competitions.example.co.uk`) pointing to the server's IPv4 address;
- an **AAAA record** pointing to its IPv6 address, if the host gave you one.

DNS changes can take from a few minutes to a few hours to work everywhere.

## 5. First server setup (once)

The script `scripts/server-setup.sh` sets up a fresh server safely. It:

- creates a user called `deploy` and gives it your public key;
- turns off logging in as `root` and logging in with passwords;
- turns on the firewall (only SSH, web and secure web are allowed);
- turns on automatic security updates and fail2ban (which blocks repeated failed logins);
- installs Docker from Docker's official repository;
- adds a swap file if the server has less than 4 GB of memory;
- prepares `/srv/site` and installs the `site-deploy` program used by step 7.

The assistant will ask before running it. From the project folder on your computer:

**macOS, Linux, Git Bash or WSL:**

```sh
scp scripts/server-setup.sh root@SERVER_IP:/root/
ssh root@SERVER_IP "bash /root/server-setup.sh '$(cat ~/.ssh/mysite_deploy.pub)'"
```

**Windows PowerShell:**

```powershell
scp scripts/server-setup.sh root@SERVER_IP:/root/
ssh root@SERVER_IP "bash /root/server-setup.sh '$(Get-Content $HOME\.ssh\mysite_deploy.pub)'"
```

**Amazon Lightsail** logs in as `ubuntu`, so copy the script to `ubuntu@SERVER_IP:` and run it with
`ssh ubuntu@SERVER_IP "sudo bash /home/ubuntu/server-setup.sh '...your .pub contents...'"`.

It is safe to run again. Before you close the window, check in a **new** window that you can log in as the deploy
user: `ssh deploy@SERVER_IP`. Root and password logins are now switched off.

### Give the server a short name

Add this to the file `~/.ssh/config` on your computer (on Windows, `C:\Users\YOU\.ssh\config`), so you and the
assistant can just type `ssh mysite`:

```
Host mysite
    HostName SERVER_IP
    User deploy
    IdentityFile ~/.ssh/mysite_deploy
    IdentitiesOnly yes
```

On macOS, also add these two lines inside the same block, so the key unlocks from your Keychain:

```
    AddKeysToAgent yes
    UseKeychain yes
```

Record the alias (`mysite`) in `config/site.json` under `hosting.sshHostAlias`. The IP address can go there too: it is
not a secret.

## 6. Set up the outside services

### Stripe (test mode first)

1. In the Stripe dashboard, switch to **test mode** and copy the **secret key** (it starts `sk_test_`). Do not paste
   it into the chat: you will type it into the server in step 8.
2. Under **Developers, Webhooks**, add an endpoint: `https://YOUR-DOMAIN/api/webhooks/stripe`, sending these events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
   and `checkout.session.expired`.
3. Reveal the endpoint's **signing secret** (it starts `whsec_`). You will type that into the server in step 8 too.
4. Put the processor's name (for example "Stripe Payments UK Ltd") in `config/site.json` under
   `payments.processorName`. The privacy notice names it.

More in [payments.md](payments.md), including specialist acquirers for prize competitions.

### Email provider

1. Add your domain in the provider's dashboard. It will show DNS records to add. Add exactly what it shows:
   - **SPF**: a TXT record listing who may send email for your domain;
   - **DKIM**: one or more records that let receivers check your emails were really signed by you;
   - **DMARC**: a TXT record at `_dmarc.YOUR-DOMAIN` telling receivers what to do with mail that fails the checks.
     Start with `v=DMARC1; p=none; rua=mailto:dmarc@YOUR-DOMAIN` so you get reports without blocking anything, then
     move to `p=quarantine` and later `p=reject` once the reports look clean.
2. Wait for the dashboard to show the domain as verified.
3. Note the SMTP host, port (usually 587), user name and password or API token. The password goes into the server in
   step 8, never into the chat.

### Company details

Tell the assistant your registered company name, number and registered office address, your ICO number, the postal
entry address and your contact emails. It writes them into `config/site.json`, which the footer, terms and privacy
notice read.

## 7. First deploy

Commit your changes (the assistant can do this), then deploy from the project folder. On Windows use Git Bash or WSL.

```sh
scripts/deploy.sh mysite
```

The first time, the server does not have its secrets file yet, so the deploy stops and prints a command like:

```sh
ssh -t mysite bash /srv/site/releases/COMMIT/scripts/make-env.sh
```

## 8. Put the secrets on the server (you type them, not the assistant)

Run the command the deploy printed. The script `make-env.sh` creates `/srv/site/shared/.env`, readable only by the
deploy user:

- it generates the random secrets itself (`APP_SECRET`, `ENTRY_CODE_SECRET` and the database password);
- it asks for your domain, the TLS certificate email, the Stripe keys and the SMTP details;
- whatever you type for secrets is hidden on screen and never leaves the server.

Use test keys (`sk_test_`) until launch. To change one value later:

```sh
ssh -t mysite bash /srv/site/current/scripts/make-env.sh set STRIPE_SECRET_KEY
```

Then deploy again:

```sh
scripts/deploy.sh mysite
```

The deploy builds the site, runs the database migrations, checks the health endpoint and, if the new version is not
healthy, puts the previous version back automatically. It also takes a database backup before each deploy. Caddy
gets the HTTPS certificate on its own once DNS points at the server.

## 9. Create your owner account and turn on two-factor login

1. Open `https://YOUR-DOMAIN`, sign up with your own email, and click the confirmation link in the email.
2. Make that account the owner:

   ```sh
   ssh mysite
   cd /srv/site/current && docker compose exec app node dist/create-owner.mjs you@example.com
   ```

3. Log in again. You will be asked to set up two-factor authentication with an authenticator app before the admin
   area opens. Later, make a second trusted account an owner too, so you cannot be locked out.

## 10. Before launch

- Test a full purchase with Stripe test cards, a postal entry, and a draw (create a short test competition).
- Have the terms, privacy notice and other templates in `docs/legal/` and `docs/gdpr/` reviewed by a solicitor, and
  tick them off in `config/site.json` under `legalReviewed`.
- Set up backups and the monthly restore test, log retention and monitoring: [deploy.md](deploy.md) sections 11 to 13.
- When ready, switch Stripe to live keys with `make-env.sh set` (and a live webhook endpoint), and deploy.
- Ask FairDraw for an audit once you have some draws: [fairdraw.md](fairdraw.md).

Updating and rolling back are covered in [deploy.md](deploy.md) sections 14 and 15. With this setup, updating is
simply: commit, then `scripts/deploy.sh mysite`.

## Optional: a deploy-only key

FairDraw's own deploys use a key that can do nothing except deploy. If someone stole that key, they could not log in
to your server.

1. Make a second key for your own maintenance logins, as in step 2, named `mysite_admin`, and load it into your agent.
2. Add its `.pub` contents as a new line in `/home/deploy/.ssh/authorized_keys` on the server (log in with
   `ssh mysite` and edit the file), and check that `ssh -i ~/.ssh/mysite_admin deploy@SERVER_IP` works.
3. In the same file, put this in front of the **deploy** key's line (with one space before `ssh-ed25519`):

   ```
   command="/usr/local/bin/site-deploy",restrict ssh-ed25519 AAAA... deploy-mysite
   ```

4. Add a second block to `~/.ssh/config` called `mysite-admin` using `mysite_admin` as the `IdentityFile`, and use that
   for maintenance logins (steps 8 and 9). `scripts/deploy.sh mysite` keeps working, because `site-deploy` reads the
   requested commit from the forced command.

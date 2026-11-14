# Choosing a host

Your site runs on a small virtual server (often called a VPS, Droplet or instance) that you rent from a hosting
company. These hosts were chosen because their dashboards are friendly and their beginner guides are good, and all of
them have data centres in the UK or the EU, which keeps your players' personal data close to home.

No host here pays us anything, and none of the links below are affiliate or referral links. Prices change often, so
this guide does not quote any: check each host's own pricing page before you choose.

## What size of server

- **Memory:** 2 GB RAM at the very least. The site (Next.js) and its database (PostgreSQL) both run on the same
  server. More memory gives more headroom when you build a new release. `scripts/server-setup.sh` adds a swap file
  automatically on servers with less than 4 GB.
- **Operating system:** Ubuntu LTS (the newest "long-term support" version the host offers). The setup script only
  supports Ubuntu.
- **Disk:** the smallest disk offered with 2 GB RAM is usually enough to start. Backups go off the server (see
  [deploy.md](deploy.md)).

## Recommended hosts, in order

### 1. DigitalOcean (London region)

The best tutorials for beginners. Choose the **London** region when you create the server.

Add your SSH public key **before** you create the Droplet: go to **Settings, then Security**, and add it there. Keys
cannot be added to an existing Droplet from the control panel, so if you forget, it is quicker to destroy the Droplet
and create it again.

- Adding SSH keys: https://docs.digitalocean.com/products/droplets/how-to/add-ssh-keys/
- Recommended setup for a new Droplet: https://docs.digitalocean.com/products/droplets/getting-started/recommended-droplet-setup/

### 2. Amazon Lightsail (London region)

Simple fixed-price plans and an SSH window in the browser. Choose the **London** region.

Lightsail key pairs belong to one region: upload or create your key in the London region. You log in as the user
`ubuntu` (not `root`) and use `sudo`, which [start-here.md](start-here.md) shows.

- Getting started: https://aws.amazon.com/getting-started/hands-on/launch-a-virtual-machine/

### 3. Akamai Cloud (Linode), London

A long-established host with clear documentation. Choose the London region and add your SSH public key when you
create the server.

- https://www.linode.com/docs/

### 4. Vultr, London

Choose the London location and add your SSH public key when you deploy the server.

- https://docs.vultr.com/

### 5. Hetzner (Germany or Finland)

Usually the cheapest of the five. Its data centres are in the EU (Germany and Finland), not the UK. That is fine
under UK GDPR, because UK law treats the EU and EEA as giving adequate protection to personal data, but Hetzner is not
a UK company, so mention the location in your privacy notice and records of processing.

- https://docs.hetzner.com/cloud/

## No server: Vercel and Neon

For a demo, a brand trial or a private test, the site can run without a server of your own: Vercel runs the site and
Neon the database, both with free plans. Vercel's free plan is for non-commercial use only, so a site that sells
tickets needs a paid plan there, or one of the servers above. See [deploy-vercel.md](deploy-vercel.md).

## After you have chosen

Write down the server's public IP address, and carry on with [start-here.md](start-here.md), step 4.

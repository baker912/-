# Self-Hosting Guide

This guide helps you deploy the Asset Management System to your own server using GitHub Actions.

## Prerequisites

1. A Linux server (Ubuntu/Debian/CentOS) with public IP
2. A domain name (optional)
3. GitHub repository

## Quick Start

1. **Configure Server**
   - Install Nginx: `apt install nginx` or `yum install nginx`
   - Start Nginx: `systemctl enable nginx && systemctl start nginx`

2. **Configure GitHub Secrets**
   Go to your GitHub repository -> Settings -> Secrets and variables -> Actions
   Add the following secrets:
   - `SERVER_HOST`: Your server IP address
   - `SERVER_USER`: Your server username (e.g., root)
   - `SERVER_SSH_KEY`: Your server private key (content of ~/.ssh/id_rsa or similar)

3. **Deploy**
   - Push code to `main` branch
   - GitHub Actions will automatically build and deploy to `/usr/share/nginx/html`

## Troubleshooting

- If deployment fails at SSH step, check if public key is added to `~/.ssh/authorized_keys` on server.
- If page returns 404, check Nginx configuration `try_files $uri $uri/ /index.html;`.

## Status

- [x] Initial Setup
- [x] Automation Configured
- [x] First Deployment Triggered
- [x] Deployment Speed Optimized (Compression + Caching)

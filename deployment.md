# GitLab Pages Deployment

This project is configured to automatically deploy to GitLab Pages when release tags are created.

## How It Works

### Automatic Deployment (Release Tags)
When you create a release tag following the pattern `vX.Y.Z`, the CI/CD pipeline will:
1. Build the React application
2. Deploy it to GitLab Pages
3. Make it available at `https://yournamespace.gitlab.io/yourproject/`

### Staging Deployment (Manual)
You can also deploy the main branch to staging:
1. Go to your GitLab project → CI/CD → Pipelines
2. Find the latest pipeline on the main branch
3. Click "Play" for the `pages:staging` job

## Creating a Release

### Method 1: Using Git CLI
```bash
# Create and push a release tag
git tag v1.0.0
git push origin v1.0.0
```

### Method 2: Using GitLab UI
1. Go to your GitLab project → Repository → Tags
2. Click "New tag"
3. Enter tag name (e.g., `v1.0.0`)
4. Select the main branch as the target
5. Click "Create tag"

### Method 3: Using Git Releases
1. Go to your GitLab project → Deploy → Releases
2. Click "New release"
3. Enter tag name (e.g., `v1.0.0`)
4. Add release notes
5. Click "Create release"

## Deployment URLs

- **Production:** `https://yournamespace.gitlab.io/whisper-web/`
- **Staging:** `https://yournamespace.gitlab.io/-/whisper-web/-/jobs/$CI_JOB_ID/artifacts/public/index.html`

## Custom Domain

To use a custom domain:
1. Follow the instructions in `.gitlab-pages.yml`
2. Update your DNS settings
3. Configure the domain in GitLab Pages settings

## Troubleshooting

### Common Issues

1. **Build fails:**
   - Check the CI/CD pipeline logs
   - Ensure all dependencies are properly installed
   - Verify the build command works locally

2. **Deployment fails:**
   - Check if the tag follows the correct pattern
   - Verify you have push permissions to the repository
   - Check GitLab Pages settings

3. **Assets not loading:**
   - The Vite configuration is set up to handle GitLab Pages subdirectory deployment
   - Ensure the `base` path is correctly configured

### Monitoring

- View pipeline status: `https://gitlab.com/yournamespace/yourproject/-/pipelines`
- View Pages deployment: `https://gitlab.com/yournamespace/yourproject/pages`

## Environment Variables

The CI/CD pipeline uses these GitLab-provided variables:
- `$CI_PAGES_URL`: Pages URL
- `$CI_PROJECT_NAME`: Project name
- `$CI_COMMIT_TAG`: Current tag
- `$CI_COMMIT_SHA`: Commit hash

## Performance Optimization

The build configuration includes:
- Code splitting for vendor libraries
- Separate chunk for the large Transformers.js library
- Sourcemaps for debugging
- Optimized asset loading for GitLab Pages
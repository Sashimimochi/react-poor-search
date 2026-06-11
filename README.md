# React Poor Search

This is a poor search component for react.
You upload excel file to make search target.

[Demo Page](https://sashimimochi.github.io/react-poor-search/)

## Usage

example

```js
import ReactPoorSearch from '@sashimimochi/react-poor-search';

function App() {
  return (
    <div className="App">
      <ReactPoorSearch />
    </div>
  );
}

export default App;

```

## Development

### Release Process

The release process is fully automated via GitHub Actions:

1. **Version Bump**: Update the version in `package.json` in your PR
2. **PR Review**: The `Version Bump Check` workflow ensures the version is incremented
3. **Merge to Main**: When your PR is merged to `main`, the `Tag on Merge` workflow automatically:
   - Creates a GitHub Release with the version from `package.json`
   - Generates release notes automatically
4. **Automatic Deployment**: The `Publish and Deploy` workflow is triggered by the release and:
   - Publishes the package to npm (requires `NPM_TOKEN` secret)
   - Builds and deploys the demo to GitHub Pages

#### Required Secrets

- `NPM_TOKEN`: npm authentication token for publishing packages

The `GITHUB_TOKEN` is automatically provided by GitHub Actions.


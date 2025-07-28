import { Release, withDefaultName, withDefaultContainer, withCommonLabels } from 'synku'
import { createWebApp } from './components/webapp'

export default async function () {
  const release = new Release('example-app', { environment: 'dev' }, (release) => {
    createWebApp(release)

    // Add default behaviors
    release.addBehaviour(withDefaultName)
    release.addBehaviour(withCommonLabels('example-app', '1.0.0'))
  })

  release.addBehaviour(withDefaultContainer)
  release.validate()
  return release
}

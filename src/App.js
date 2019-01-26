import React, { Component } from 'react'
import {
  Header,
  Icon,
  Container,
  Menu,
  Message,
  Button
} from 'semantic-ui-react'
import {
  Stitch,
  UserPasswordCredential,
  RemoteMongoClient
} from 'mongodb-stitch-browser-sdk'
import {
  AwsServiceClient,
  AwsRequest
} from 'mongodb-stitch-browser-services-aws'
import BSON from 'bson'

import Login from './components/Login'
import Feed from './components/Feed'
import UploadModal from './components/UploadModal'

import SampleData from './sample_data'

const pacificoFont = {
  fontFamily: "'Pacifico', cursive"
}

const githubButtonStyle = {
  position: 'fixed',
  margin: '1em',
  top: 0,
  right: 0,
  zIndex: 6
}

const convertImageToBSONBinaryObject = file => {
  return new Promise(resolve => {
    var fileReader = new FileReader()
    fileReader.onload = event => {
      var eventBinary = new BSON.Binary(new Uint8Array(event.target.result))
      resolve(eventBinary)
    }
    fileReader.readAsArrayBuffer(file)
  })
}

class App extends Component {
  constructor(props) {
    super(props)
    this.appId = 'picstream-xdivd'

    this.state = {
      isAuthed: false,
      email: '',
      entries: []
    }
  }

  componentDidMount = async () => {
    this.client = Stitch.initializeAppClient(this.appId)

    // Exercise 4
    // TODO: Initialize the RemoteMongoClient

    this.aws = this.client.getServiceClient(AwsServiceClient.factory, 'aws')

    const isAuthed = this.client.auth.isLoggedIn

    if (isAuthed) {
      const email = this.client.auth.user.profile.email
      const entries = await this.getEntries()
      this.setState({ isAuthed, email, entries })
    }
  }

  login = async (email, password) => {
    const { isAuthed } = this.state

    if (isAuthed) {
      return
    }
    
    const credential = new UserPasswordCredential(email, password)
    const user = await this.client.auth.loginWithCredential(credential)

    const entries = await this.getEntries()
    this.setState({
      isAuthed: true,
      email,
      entries
    })
  }

  logout = async () => {
    this.client.auth.logout()

    this.setState({ isAuthed: false, email: '', entries: [] })
  }

  getEntries = async () => {
    // Exercise 4
    // TODO: Replace the following with a MongoDB Query to grab all entries,
    // sorted by ts descending. This function should return a Promise.
    return new Promise(resolve => {
      resolve(SampleData)
    })
  }

  handleFileUpload = async (file, caption) => {
    if (!file) {
      return
    }

    const saveFileResult = await this.saveFile(file)

    const saveEntryResult = await this.saveEntry(caption, saveFileResult)

    const entries = await this.getEntries()
    this.setState({ entries })

    return saveEntryResult
  }

  saveFile = async file => {
    const key = '${this.client.auth.user.id}-${file.name}'
    const bucket = 'picstream-imb'
    const url = 'https://${bucket}.s3.amazonaws.com/${encodeURIComponent(key)}'

    const bsonFile = await convertImageToBSONBinaryObject(file)

    // AWS S3 Request
    const args = {
      ACL: 'public-read',
      Bucket: bucket,
      ContentType: file.type,
      Key: key,
      Body: bsonFile
    }

    const request = new AwsRequest.Builder()
      .withService('s3')
      .withAction('PutObject')
      .withRegion('us-east-2')
      .withArgs(args)
      .build()

    const s3Result = await this.aws.execute(request)

    return {
      url,
      file: {
        name: file.name,
        type: file.type
      },
      s3: {
        bucket,
        key,
        ETag: s3Result.ETag
      }
    }
  }

  saveEntry = async (caption, s3Data) => {
    // Exercise 4
    // TODO: Replace with a MongoDB query to insert data into
    // the stream collection. The function should return a Promise.
    return new Promise(resolve => {
      resolve({
        insertedId: '12345'
      })
    })
  }

  render() {
    const { isAuthed, email, entries } = this.state
    return (
      <Container style={{ marginTop: '1em' }}>
        <Header as="h1" textAlign="center">
          <Header.Content>
            <Icon name="camera retro" />{' '}
            <span style={pacificoFont}>PicStream</span>
            <Header.Subheader>
              Built using MongoDB Stitch and AWS S3
            </Header.Subheader>
          </Header.Content>
        </Header>
        {isAuthed ? (
          <Container>
            <Menu borderless size="small" stackable>
              <Menu.Item header>Welcome, {email}</Menu.Item>
              <Menu.Item>
                <UploadModal handleFileUpload={this.handleFileUpload} />
              </Menu.Item>
              <Menu.Item
                position="right"
                content="Logout"
                onClick={this.logout}
              />
            </Menu>
            {entries.length > 0 ? (
              <Feed entries={entries} />
            ) : (
              <Message color="blue" header="No Entries Found ☹️" />
            )}
          </Container>
        ) : (
          <Login loginUser={this.login} />
        )}
        <div style={githubButtonStyle}>
          <Button
            as="a"
            href={`https://github.com/aydrian/workshop-picstream/`}
            icon="github"
            content="Source"
            secondary
            target="_blank"
          />
        </div>
      </Container>
    )
  }
}

export default App

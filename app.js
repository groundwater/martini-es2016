import http from 'http'
import split from 'split'
import Api from 'lib-http-api'
import {Writable, Readable} from 'stream'

class Server {
  constructor(){
    this.user = {}
  }

  // add a single user
  // this is a simple case
  async putUser(uid, user){
    this.user[uid] = user
  }

  // get a user
  // this is also pretty simple
  async getUser(uid) {
    return this.user[uid]
  }

  // get all user ids
  // we stream the results back, rather than return them as an array
  // you can yield a promise, or a value
  async getUserIds() {
    let keys = Object.keys(this.user)
    let make = function*() {
      for (var key of keys) {
        yield key
      }
    }
    return make()
  }

  // incoming requests are generators
  // they might return promises, so you need to await them
  async putUsers(users) {
    let out = {}
    for (let body of users) {
      let {id, user} = await body

      out[id] = user
    }
    this.user = out
  }

}

class Client {

  constructor(server) {
    this.server = server
  }

  // simple get
  async getUser(uid) {
    return await this.server.getUser(uid)
  }

  // simple put
  async putUser(uid, user) {
    await this.server.putUser(uid, user)
  }

  async putUsers(gen) {
    await this.server.putUsers(gen())
  }

  async getUserIds() {
    let gen = await this.server.getUserIds()
    var out = []
    for (let item of gen) {
      out.push(await item)
    }

    return out
  }
}

class Gateway {
  constructor(api, server, host, port){
    this.api = api
    this.server = server
    this.host = host
    this.port = port
    this.user = {}
  }

  // add a single user
  // this is a simple case
  async putUser(uid, user){
    let req = this.api.request('putUser', {uid})

    http.request(req).end(JSON.stringify(user))

    return this.server.putUser(uid, user)
  }

  // get a user
  // this is also pretty simple
  async getUser(uid) {
    console.log('GET /user/%s', uid)
    return this.server.getUser(uid)
  }

  // get all user ids
  // we stream the results back, rather than return them as an array
  // you can yield a promise, or a value
  async getUserIds() {
    console.log('GET /users')
    return this.server.getUserIds()
  }

  // incoming requests are generators
  // they might return promises, so you need to await them
  async putUsers(users) {
    console.log('PUT /users')
    for (let user of users) {
      console.log(await user)
    }
    return this.server.putUsers(users)
  }

}

let api = Api().New(8080, 'localhost')
api.add('putUser', {
  method: 'PUT',
  route: '/user/:uid'
})

let server  = new Server()
let gateway = new Gateway(api, server, 'localhost', 8080)
let client  = new Client(gateway)

class Sink extends Writable {
  constructor(gen){
    super()

    this.gen = gen
  }
  _write(chunk, encoding, done) {
    
  }
}

http.createServer(function(req,res){
  let {handle, params, query} = api.handle(req.method, req.url)
  // console.log(handle, params)
  // req.pipe(process.stdout)
  // res.end()
  if (server[handle]) {
    req.pipe(new Sink())
  }
  else {
    res.statusCode = 404
    res.end('Not Found')
  }
}).listen(8080)

client.putUser('bob', {fname: 'bob', lname: 'smith'})
// .then(ok => {
//   return client.putUser('kim', {fname: 'kim', lname: 'lee'})
// })
// .then(ok => {
//   return client.getUserIds()
// })
// .then(ids => {
//   let collect = async function(){
//     let out = []
//     for (let id of ids) {
//       out.push(await client.getUser(id))
//     }
//     return out
//   }
//   return collect()
// })
// .then(console.log)
// .then(ok => {
//   return client.putUsers(function*(){
//
//     // can yield a promise
//     yield new Promise(done => {
//       done({id: 'tom', user: {fname: 'carl', lname: 'bo'}})
//     })
//
//     // or yield a value
//     yield {id: 'jeff', user: {fname: 'jeff', lname: 'hare'}}
//   })
// })
// .then(ok => {
//   return client.getUserIds()
// })
.then(console.log)
.catch(console.error)

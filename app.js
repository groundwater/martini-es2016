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

let server = new Server()
let client = new Client(server)

client.putUser('bob', {fname: 'bob', lname: 'smith'})
.then(ok => {
  return client.putUser('kim', {fname: 'kim', lname: 'lee'})
})
.then(ok => {
  return client.getUserIds()
})
.then(ids => {
  let collect = async function(){
    let out = []
    for (let id of ids) {
      out.push(await client.getUser(id))
    }
    return out
  }
  return collect()
})
.then(console.log)
.then(ok => {
  return client.putUsers(function*(){

    // can yield a promise
    yield new Promise(done => {
      done({id: 'tom', user: {fname: 'carl', lname: 'bo'}})
    })

    // or yield a value
    yield {id: 'jeff', user: {fname: 'jeff', lname: 'hare'}}
  })
})
.then(ok => {
  return client.getUserIds()
})
.then(console.log)
.catch(console.error)

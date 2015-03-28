import http    from 'http'
import stream  from 'stream'
import split   from 'split'
import HttpApi from 'lib-http-api'

class Server {
  constructor() {
    this.users = {}
  }

  async putUsers(gen) {
    for (let i of gen) {
      console.log('putUsers', await i)
    }
  }

  async getUsers() {
    let users = this.users
    return function*(){
      for(user of users) {
        yield user
      }
    }()
  }

  async getUser(props) {
    let {uid} = props
    let user = this.users[uid]

    return function*(){
      if (user) yield {fname: 'boe'}
    }()
  }
}

function* strToGen(_st){
  let st = _st.pipe(new split())

  var done = false
  var data = []
  var prom

  st.on('data', line => {
    // console.log('data>')
    try {
      data.push(JSON.parse(line))
    }
    catch(e) {
      // console.error(e)
      return
    }

    if (prom) {
      prom(data.shift())
      prom = null
    }
  })

  st.on('end', _ => {
    // console.log('end>')
    done = true
    if (prom) prom(null)
  })

  while(!done || (data.length > 0)) {
    if (data.length > 0) {
      yield data.shift()
    }
    else {
      // console.log('promise>')
      yield new Promise(done => {
        prom = done
      })
    }
  }
}

function str(gen) {
  var str = new stream.PassThrough()

  let next = async function() {
    for (let i of gen) {
      str.write(JSON.stringify(await i) + '\n')
    }
  }()

  next.then(function(){
    str.end()
  })

  return str
}

class Client {
  constructor(api) {
    this.api  = api
  }

  _makeRequest(name, props, gen) {
    let opt = this.api.request(name, props)

    var fin
    let req = http.request(opt, function(res){
      fin(strToGen(res)) //2938
    })

    if (gen && gen[Symbol.iterator]) {
      // this is a generator
      str(gen).pipe(req)
    }
    else if (gen) {
      // this is an object or value
      req.end(JSON.stringify(gen))
    }
    else {
      // nothing returned
      req.end()
    }

    return new Promise(done => {
      fin = done
    })
  }

  putUsers(gen) {
    return this._makeRequest('putUsers', {}, gen)
  }

  getUsers(props) {
    return this._makeRequest('getUsers', props)
  }

  getUser(props) {
    return this._makeRequest('getUser', props)
  }

}

let api = HttpApi().New(8080, 'localhost')

let sv = new Server()
var cl = new Client(api)
let st = new stream.PassThrough()

api.add('getUser', {
  method : 'GET',
  route  : '/user/:uid'
})

api.add('getUsers', {
  method : 'GET',
  route  : '/users'
})

api.add('putUsers', {
  method : 'PUT',
  route  : '/users'
})

var sr = http.createServer(function (req, res){
  let {handle, params} = api.handle(req.method, req.url)

  sv[handle](strToGen(req))
    .then(function(gen){
      res.statusCode = 200
      if (gen && gen[Symbol.iterator]) {
        // this is a generator
        str(gen).pipe(res)
      }
      else if (gen) {
        // this is an object or value
        res.end(JSON.stringify(gen))
      }
      else {
        // nothing returned
        res.end()
      }
    })
    .catch(function(e){
      console.error(e)
      console.error(e.stack)
      res.statusCode = 500
      res.end()
    })
})

sr.listen(8080, function(){
  cl.getUser({uid: 'bob'})
  .then(async function(gen){
    for (let u of gen) {
      console.log('getUser', await u)
    }
  })
  .then(function(){
    return cl.putUsers(function*(){
      yield {fname: 'bob'}
      yield {fname: 'kim'}
      yield {fname: 'joe'}
    }())
  })
  .then(async function(gen){
    for(var u of gen) {
      console.log('putUsers', await u)
    }
  })
  .then(ok => {
    let names = []
    return cl.getUsers(names)
  })
  .then(async function(gen) {
    for (var u of gen) {
      console.log('getUsers', await u)
    }
  })
})

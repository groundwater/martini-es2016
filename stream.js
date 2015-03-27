import http from 'http'
import stream from 'stream'
import split from 'split'
import HttpApi from 'lib-http-api'

class Server {
  async putUsers(gen) {
    for (let i of gen) {
      console.log('>', await i)
    }
    // console.log('k')
    return function*(){
      yield {fname: 'ore'}
      yield {fname: 'rom'}
    }()
  }

  async getUsers() {
    return function*(){
      yield {fname: 'ore'}
      yield {fname: 'rom'}
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

  putUsers(gen) {
    let opt = this.api.request('putUsers', {})

    var fin
    let req = http.request(opt, function(res){
      fin(strToGen(res)) //2938
    })

    str(gen).pipe(req)

    return new Promise(done => {
      fin = done
    })
  }

  getUsers(props) {
    let opt = this.api.request('putUsers', {})
    
    var fin
    let req = http.request(opt, function(res){
      fin(strToGen(res)) //2938
    })

    req.end()

    return new Promise(done => {
      fin = done
    })
  }

}

let api = HttpApi().New(8080, 'localhost')

let sv = new Server()
var cl = new Client(api)
let st = new stream.PassThrough()

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
      // console.log('then')
      res.statusCode = 200
      str(gen).pipe(res)
    })
    .catch(function(e){
      console.error(e)
      console.error(e.stack)
      res.statusCode = 500
      res.end()
    })
})
sr.listen(8080, function(){
  cl.putUsers(function*(){
    yield {fname: 'bob'}
    yield {fname: 'kim'}
    yield {fname: 'joe'}
  }())
  .then(async function(gen){
    for(var u of gen) {
      console.log('<', await u)
    }
  })
  .then(ok => {
    let names = []
    return cl.getUsers(names)
  })
  .then(async function(gen) {
    for (var u of gen) {
      console.log('+', await u)
    }
  })
})

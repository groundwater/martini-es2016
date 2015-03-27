import http from 'http'
import stream from 'stream'
import split from 'split'

class Server {
  async putUsers(gen) {
    for (let i of gen) {
      console.log(await i)
    }
  }
}

function* gen(_st){
  let st = _st.pipe(new split())

  var done = false
  var data = []
  var prom

  st.on('data', line => {
    data.push(JSON.parse(line))

    if (prom) {
      prom(data.shift())
      prom = null
    }
  })

  st.on('end', _ => {
    done = true
  })

  while(!done || (data.length > 0)) {
    if (data.length > 0) {
      yield data.shift()
    }
    else {
      yield new Promise(done => {
        prom = done
      })
    }
  }
}

let sv = new Server()
let st = new stream.PassThrough()

http.createServer(function (req, res){
  sv.putUsers(gen(req))
    .then(function(ok){
      res.statusCode = 200
      res.end()
    })
    .catch(function(e){
      console.error(e)
      console.error(e.stack)
      res.statusCode = 500
      res.end()
    })
}).listen(8080, function(){
  var opt = {
    port: 8080,
    headers: {
      'Transfer-Encoding': 'chunked'
    }
  }
  var req = http.request(opt, function(res){
    res.pipe(process.stdout)
  })
  var int = 0
  setInterval(function(){
    req.write(JSON.stringify({id: int++}) + '\n')
  }, 1500)
})

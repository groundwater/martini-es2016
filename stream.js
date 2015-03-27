import stream from 'stream'
import split from 'split'

async function putUsers(gen) {
  for (let i of gen) {
    console.log('>', String(await i))
  }
}

let gen = function*(_st){
  let st = _st.pipe(new split())

  var done = false
  var data = []
  var prom

  st.on('data', line => {
    data.push(line)

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

let st = new stream.PassThrough()

putUsers(gen(st))
.catch(function(e){
  console.error(e)
  console.error(e.stack)
})

var int = 0
setInterval(function(){
  st.write(String(int++) + '\n')
}, 500)

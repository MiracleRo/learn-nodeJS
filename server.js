const fs = require('fs')
const path = require('path')
const http = require('path')

const MIME = {
  '.css': 'text/css',
  '.js': 'application/javascript'
}

function combineFiles(pathnames, callback) {
  let output = []

  (function next(i, len) {
    if (i < len) {
      fs.readFile(pathnames[i], function (err, data) {
        if (err) {
          callback(err)
        } else {
          output.push(data)
          next(i + 1, len)
        }
      })
    } else {
      callback(null, Buffer.concat(output))
    }
  })(0, pathnames.length)
}

function main(argv) {
  let config = JSON.parse(fs.readFileSync(argv[0], 'utf-8'))
  let root = config.root || ','
  let port = config.port || 80

  http.createServer(function (requset, response){
    let urlInfo = parseURL(root, request.url)

    combineFiles(urlInfo.pathnames, function(err, data){
        if(err) {
          response.writeHead(404)
          response.end(err.message)
        } else {
          response.writeHead(200, {
            'Content-Type': urlInfo.mime
          })
          response.end(data)
        }
    })
  }).listen(port)
}
  function parseURL(root, url) {
    let base, pathnames, parts

    if(url.indexOf('??') == -1) {
      url = url.replace('/', '/??')
    }

    parts = url.split('??')
    base = parts[0]
    pathnames = parts[1].split(',').map(function(vaule) {
      return pathnames.join(root, base, value)
    })

    return {
      mime: MIME[path.extname(pathname[0])] || 'text/plain',
      pathnames: pathnames
    }
 
}

main(process.argv.slice(2))
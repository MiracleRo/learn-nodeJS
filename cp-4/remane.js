const http = require('http')
const fs = require('fs')
const url = require('url')

function load_album_list(callback) {
  fs.readdir('albums', (err, files) => {
      if(err) {
        callback(err)
        return
      }
      var only_dirs = []
      const iterator = index => {
        if (index === files.length) {
          callback(null, only_dirs)
          return
        }
        fs.stat("albums/" + files[index], (err, stats) => {
          if(err) {
            callback(make_error("file_error",JSON.stringify(err)));
            return;
          }
          if(stats.isDirectory()) {
            var obj = { name: files[index] }
            only_dirs.push(obj)
          }
          iterator(index+1)
        })
      }
      iterator(0)
  })
}

function load_album(album_name, page, page_size, callback) {
  // we will just assume that any directory in our 'albums'
  // subfolder is an album.
  fs.readdir("albums/" + album_name, (err, files) => {
      if (err) {
          if (err.code == "ENOENT") {
              callback(no_such_album());
          } else {
              callback(make_error("file_error",
                                  JSON.stringify(err)));
          }
          return;
      }

      var only_files = [];
      var path = `albums/${album_name}/`;

      var iterator = (index) => {
          if (index == files.length) {
              var ps
              var start = (page-1) * page_size
              ps = only_files.slice(start, start + page_size)
              var obj = { short_name: album_name,
                          photos:ps };
              callback(null, obj);
              return;
          }

          fs.stat(path + files[index], (err, stats) => {
              if (err) {
                  callback(make_error("file_error",
                                      JSON.stringify(err)));
                  return;
              }
              if (stats.isFile()) {
                  var obj = { filename: files[index],
                              desc: files[index] };
                  only_files.push(obj);
              }
              iterator(index + 1)
          });
      }
      iterator(0);
  });
}

function handle_list_albums(req, res) {
  load_album_list((err, albums) => {
      if (err) {
          send_failure(res, 500, err);
          return;
      }

      send_success(res, { albums: albums });
  });
}



function handle_get_album(req, res) {
  var getp = req.parsed_url.query;
  var page_num = getp.page ? parseInt(getp.page) : 0;
  var page_size = getp.page_size ? parseInt(getp.page_size) : 1000;

  if (isNaN(parseInt(page_num))) page_num = 0;
  if (isNaN(parseInt(page_size))) page_size = 1000;

  var core_url = req.parsed_url.pathname;
  // format of request is /albums/album_name.json
  var album_name = core_url.substr(7, core_url.length - 12);
  load_album(album_name, page_num, page_size, (err, album_contents) => {
      if (err && err.error == "no_such_album") {
          send_failure(res, 404, err);
      }  else if (err) {
          send_failure(res, 500, err);
      } else {
          send_success(res, { album_data: album_contents });
      }
  });
}

function make_error(err, msg) {
  var e = new Error(msg);
  e.code = err;
  return e;
}

function send_success(res, data) {
  res.writeHead(200, {"Content-Type": "application/json"});
  var output = { error: null, data: data };
  res.end(JSON.stringify(output) + "\n");
}

function send_failure(res, server_code, err) {
  var code = (err.code) ? err.code : err.name;
  res.writeHead(server_code, { "Content-Type" : "application/json" });
  res.end(JSON.stringify({ error: code, message: err.message }) + "\n");
}


function invalid_resource() {
  return make_error("invalid_resource",
                    "the requested resource does not exist.");
}

function no_such_album() {
  return make_error("no_such_album",
                    "The specified album does not exist");
}

function handle_rename_file(req, res) {
  
}

function handle_incoming_request(req, res) {
  console.log('INCOMING REQUEST: ' + req.method + ' ' + req.url)
  req.parsed_url = url.parse(req.url, true)
  let core_url = req.parsed_url.pathname
  let method = req.method.toLowerCase()
  if(core_url === '/albums.json' && method === 'get') {
    handle_list_albums(req, res)
  } else if(core_url.match(/\/albums\/\S+\.json/) && method === 'get'){
    handle_get_album(req, res)
  } else if(core_url.match(/rename\.json/) && method === 'post'){
    handle_rename_file(req, res)
  }else {
    send_failure(res, 404, invalid_resource())
  }
}

const s = http.createServer(handle_incoming_request)
s.listen(8080)
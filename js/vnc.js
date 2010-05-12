// requires hobs.js and socket.js

function Vnc(o) {
  
  // Default values
  if( !o ) o = {};
  if( o.vnc_host == undefined ) o.vnc_host = 'wstest.local';
  if( o.vnc_port == undefined ) o.vnc_port = '5900';
  
  if( o.ws_host == undefined ) o.ws_host = 'wstest.local';
  if( o.ws_port == undefined ) o.ws_port = '8000';
    
  if( o.agent == undefined ) o.agent = 'ANY'; // Mifcho overlay agent
  
  // GUI bindings
  if( o.log == undefined ) o.log = function (msg) {
    document.getElementById("log").innerHTML += (new Date()).toTimeString()+': '+msg+'\n';
  }
  if (o.ctx_id == undefined ) o.ctx_id = 'vnc_canvas';
  if (o.fc_id == undefined ) o.fc_id = 'frame_container';
  
  var self    = this;
  self.rfb    = new Rfb();
  
  // VNC states
  var CONNECTING          = 0;
  var HANDSHAKE           = 100;
  var HANDSHAKE_VER       = 110;
  var HANDSHAKE_SEC       = 120;  
  var HANDSHAKE_SEC_RES   = 140;
  var HANDSHAKE_SRV_INIT  = 150;
  var CONNECTED     = 200;
  var DISCONNECTED  = 300;
  
  self.state  = CONNECTING;
  
  // Framebuffer dimensions, servername and some other stuff
  self.server_info = {width:      0,  height:       0,  bpp:        0,
                      depth:      0,  big_endian:   0,  true_color: 0,
                      red_max:    0,  green_max:    0,  blue_max:   0,
                      red_shift:  0,  green_shift:  0,  blue_shift: 0,
                      name:       '', scaled:       0,  ver: ''};  
  var ctx; // Initialized during handshake
  var msg_type = -1;
  var num_r = -1;
  
  self.buffer = '';
  self.processing = false;
  
  // Assign options to vnc-function...
  for (param in o) { self[param] = o[param]; }
    
  // Wrap around communication library
  self.disconnect = function () { self.ws.disconnect(); };
  self.connect    = function () {
    
    self.state = CONNECTING;
    self.ws = new Hobs('http://'+self.ws_host+':'+self.ws_port+'/tun:hobs/host:'+self.vnc_host+'/port:'+self.vnc_port+'/');
    
    self.ws.onopen = function() {
      self.state = HANDSHAKE;
    };
    
    self.ws.onclose = function() {
      self.state = DISCONNECTED;
    };
    
    // Do something with incoming data!
    self.ws.onmessage = function(event) {
      
      self.buffer += $.base64Decode( event.data );
      self.log('['+self.processing+','+self.buffer.length+']');
            
      if (!self.processing) {
        process_buffer(); 
      }      

    }
    
    self.disconnect = function () { self.ws.disconnect(); };
  }
  
  // A non-blocking read call. It will attempt and read bytes
  function read(size) {
    
    var data = '';
    if (self.buffer.length >= size) {
      data   = self.buffer.slice(0, size);
      self.buffer = self.buffer.slice(size, self.buffer.length);
    }
    return data;
    
  }
  
  // Request a framebuffer update every fourth second...
  function fbur_poll() {
    self.ws.send( $.base64Encode( self.rfb.fbur(self.server_info.width, self.server_info.height, 0) ));
    setTimeout(fbur_poll, 4000);
  }
  
  var sec_types = new Array();
  
  function process_buffer() {
    
    if (!self.processing) {
      self.processing = true;
    }
    
    if ((self.state == HANDSHAKE) && (self.buffer.length >= 12)) {
      
      var rfb_ver = read(12);
      
      self.ws.send( $.base64Encode('RFB 003.008\n') );
      self.state = HANDSHAKE_SEC;
      
    } else if (self.state == HANDSHAKE_SEC) {

      // Read security types
      var num_sec = u8_to_num(read(1));
      if (num_sec != 0) {                
        for(var i=1; i<=num_sec; i++) {
          sec_types.push( u8_to_num(read(1)) );
        }
      } else {
        // Connection failed
        // TODO: handle a failde connection attempt!
      }
      self.log('Security types:' +num_sec+','+ JSON.stringify(sec_types));
      self.ws.send( $.base64Encode( num_to_u8(1)) ); // Select sec-type None
      self.state = HANDSHAKE_SEC_RES;
      
    } else if (self.state == HANDSHAKE_SEC_RES) {
      
      var sec_res = u32_to_num(read(1), read(1), read(1), read(1));

      if (sec_res == 1) { // security response = failed
        // TODO: Handle a failed security response        
      }
      
      self.log('Security Result:'+ sec_res);
      self.ws.send( $.base64Encode( num_to_u8(0) )); // Send client-init
      
      self.state = HANDSHAKE_SRV_INIT;
      
    } else if (self.state == HANDSHAKE_SRV_INIT) {
      
      var srv_init_buf = read(24);
      var name_len = 0;
      
      self.server_info.width  = u16_to_num(srv_init_buf[0], srv_init_buf[1]);
      self.server_info.height = u16_to_num(srv_init_buf[2], srv_init_buf[3]);

      self.server_info.bpp          = u8_to_num(srv_init_buf[4]);
      self.server_info.depth        = u8_to_num(srv_init_buf[5]);
      self.server_info.big_endian   = u8_to_num(srv_init_buf[6]);
      self.server_info.true_color   = u8_to_num(srv_init_buf[7]);
      
      self.server_info.red_max      = u16_to_num(srv_init_buf[8], srv_init_buf[9]);
      self.server_info.green_max    = u16_to_num(srv_init_buf[10], srv_init_buf[11]);
      self.server_info.blue_max     = u16_to_num(srv_init_buf[12], srv_init_buf[13]);
      
      self.server_info.red_shift    = u8_to_num(srv_init_buf[14]);
      self.server_info.green_shift  = u8_to_num(srv_init_buf[15]);
      self.server_info.blue_shift   = u8_to_num(srv_init_buf[16]);
      
      name_len = u32_to_num(srv_init_buf[20], srv_init_buf[21], srv_init_buf[22] ,srv_init_buf[23] );      
      self.server_info.name = read(name_len);
      
      self.log(+name_len+', '+self.server_info.name);
      self.log(JSON.stringify(self.server_info));
      
      // Initialize the canvas context
      document.getElementById(self.fc_id).innerHTML += '<canvas id="'+self.ctx_id+'" width="'+self.server_info.width+'" height="'+self.server_info.height+'"></canvas>';
      ctx = document.getElementById(self.ctx_id).getContext('2d');
      self.server_info.data = ctx.createImageData(self.server_info.width, self.server_info.height);
      
      ctx.putImageData(self.server_info.data, 0, 0);
      ctx.fillStyle = 'rgb(200,0,0)';
      ctx.fillRect(0,0, self.server_info.width, self.server_info.height);
      
      //fbur_poll(); // Start framebuffer polling
      self.ws.send( $.base64Encode( self.rfb.fbur(self.server_info.width, self.server_info.height, 0) ));
      
      self.state = CONNECTED;
      
    } else if (self.state == CONNECTED) {
      
      // Find out what the server is sending us
      if (msg_type == -1) {
        msg_type  = u8_to_num(self.buffer[0]);
      }
      
      // Handle what the server is sending us
      
      // 6.5.1 FramebufferUpdate
      if (msg_type == 0) {
                  
        if (self.buffer.length>15) {
          
          // Number of rectangles
          // Padding = 1 byte
          if (num_r == -1) {
            num_r   = u16_to_num(self.buffer[2], self.buffer[3]);
            self.buffer  = self.buffer.slice(4, self.buffer.length);
          }            
                      
          var rect = {
            x: u16_to_num(self.buffer[0], self.buffer[1]),
            y: u16_to_num(self.buffer[2], self.buffer[3]),
            w: u16_to_num(self.buffer[4], self.buffer[5]),
            h: u16_to_num(self.buffer[6], self.buffer[7]),              
            rect_encoding: u32_to_num(self.buffer[8], self.buffer[9], self.buffer[10], self.buffer[11])
          };
          var rectangle_length = rect.w*rect.h *(self.server_info.bpp/8);
          self.log('<br />['+num_r+','+self.buffer.length+','+JSON.stringify(rect)+']');
          // how much data?
          
          offset = self.buffer.length;            
          
          if (self.buffer.length >= rectangle_length+12) {
            
            self.log('draw '+num_r);
            self.rfb.draw_rectangle(rect.x, rect.y, rect.w, rect.h, self.buffer.slice(12, self.buffer.length), ctx);
            
            num_r -= 1; // decrement rectangle count
                          
            if (num_r == 0) { // no more rectangles
              num_r = -1;
              msg_type = -1;
              buffer = '';
              offset = 12;
            } else {
              buffer = self.buffer.slice(rectangle_length+12);
              offset = 0;
            }
                          
          }
        }
      
      // 6.5.2 SetColourMapEntries
      // When the pixel format uses a “colour map”, this message tells the
      // client that the specified pixel values should be mapped to the given
      // RGB intensities.
      //        
      } else if (msg_type == 1) {
        
        msg_type = -1;
        
      // 6.5.3 Bell
      // Ring a bell on the client if it has one.
      // 1      u8        2   message-type
      //
      } else if (msg_type == 2) {
        msg_type = -1;
        
      // 6.5.4 ServerCutText
      // The server has new ISO 8859-1 (Latin-1) text in its cut buffer.
      // 1      u8        3   message-type
      // 3      _         _   padding
      // 4      u32       _   length
      // length u8 array  _   text
      //
      } else if (msg_type == 3) {
                  
        buffer += received_msg;
        var text_length = u32_to_num(received_msg[4],received_msg[5],received_msg[6],received_msg[7]);
        cut_text = '';
        
        for(var i=8; i<buffer.length; i++) {
          cut_text += buffer[i];
        }
        
        self.log('[ServerCutText: '+text_length+' '+ cut_text+']')
        if (buffer.length == (8+text_length)) {
          buffer = '';
          msg_type = -1;
        }
      }
              
    }
    
    self.processing = false;
    
  }
  
  // DEbug functionality Dump a JSON representation of object to log...
  self.dump = function() {
    self.log(JSON.stringify(self));
  }

}

function Rfb() {

  // Client to server messages
  
  // 6.4.3 - FramebufferUpdateRequest
  this.fbur = function (w, h, inc) {
    
    var r =   num_to_u8(3);
        r +=  num_to_u8(inc);
        r +=  num_to_u16(0);
        r +=  num_to_u16(0);
        r +=  num_to_u16(w);
        r +=  num_to_u16(h);
    
    return r;
  }
  
  // 6.4.4 - KeyEvent
  this.keyEvent = function(key, pressed) {
    
    var r =   num_to_u8(4);
        r +=  num_to_u8(pressed);
        r +=  num_to_u16(0); // padding
        r +=  num_to_u32(key);
    
    return r;
  }
  
  // 6.4.5 - PointerEvent
  this.pointerEvent = function(x, y, pressed) {
      
    var r =   num_to_u8(5);
        r +=  num_to_u8(pressed);
        r +=  num_to_u16(x);
        r +=  num_to_u16(y);
    
    return r;
  }
  
  // 6.4.6 - ClientCutText
  // TODO: implement
  this.clientCutText = function() {}
  
  // Helper functions
  
  //
  // draw_rectangle - Draws a rectangle of raw-encoded pixel-data
  //
  // @param w int Width of the rectangle
  // @param h int Height of the rectangle
  // @param x int Horizontal start position on the virtual_fb
  // @param y int Vertical start position on the virtual_fb
  // @param data array of pixel values in raw-encoding
  // @param ctx A working 2d-canvas-context
  //
  // @requires data.length = w * h * 4
  //
  this.draw_rectangle = function(r_x, r_y, w, h, pixel_array, ctx) {
  
  // What it basicly does is to change the BGR representation to RGB....
  // and ignore the alpha channel... it could probably be optimized with
  // in-space operations instead calling getImageData...
    
    var r_buffer = ctx.getImageData(r_x, r_y, w, h);  // Get a rectangle buffer
    
    for(var i=0; i<(w*h*4);i+=4) {                    // Map BGR to RGB
                    
        r_buffer.data[i]   = u8_to_num(pixel_array[i+2]);     // Update pixels...
        r_buffer.data[i+1] = u8_to_num(pixel_array[i+1]);
        r_buffer.data[i+2] = u8_to_num(pixel_array[i]);
        r_buffer.data[i+3] = 255;                     // Ignore transparency...
              
      
    }
    
    ctx.putImageData(r_buffer, r_x, r_y);                 // Draw it
  
  }

}
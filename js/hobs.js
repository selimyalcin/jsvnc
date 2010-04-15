//
// Hobs provides a websocket-compatible interface for
// bidrectional communication in javacript.
//
// It utilizes websockets if available and falls back to utilizing
// XmlHTTPRequest in a way similar to the
// "BOSH Technique" (http://xmpp.org/extensions/xep-0124.html#technique).
//
// Hobs is named as an anagram after BOSH since it is inspired by the
// the technique, it is however far from a bosh-implementation...
// it is different... comet-thingy... smaller... almost hobbit-like...
//

function Hobs(url) {
  
  // Hobs / Websocket interface
  this.url = url;
  
  var CONNECTING  = 0;
  var OPEN        = 1;
  var CLOSING     = 2;
  var CLOSED      = 3;
    
  this.readyState     = null;
  this.bufferedAmount = null;
  
  // Network callbacks
  this.onopen     = function () {}
  this.onmessage  = function () {}
  this.onerror    = function () {}
  this.onclose    = function () {}
  
  // Network methods
  this.send   = function (data) {}
  this.close  = function () {}
  
  // Implementation to support the interface above
  
  var self = this // I need a variable i can refer to inside of other objects
                  // referring to this inside of other objects will
                  // access the other objects attributes and methods...
                  // Causing issues inside inside of onreadystatuschange...
                  // It is actually not that bad... reminds me of python...

  // Helper to do xhr fallback
  var createXHR = function () {
      try { return new XMLHttpRequest(); } catch(e) {}
      try { return new ActiveXObject('MSXML3.XMLHTTP'); } catch(e) {}
      try { return new ActiveXObject('MSXML2.XMLHTTP.3.0'); } catch(e) {}
      try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
      try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
      throw new Error('Could not find XMLHttpRequest or an alternative.');
  };
                  
  var Session    =  { id: 0,      request_id: 0,
                      sending: 0, wait: 50
                    };
  
  var input_queue  = new Array();
  var output_queue = new Array();
    
  connect(); // Connect!
  
  // Should check if there is currently a send in progress and queue the send
  // in that case
  // We need the main-connection to be running!
  // TODO: this should throw an exception...
  self.send = function (data, check) {
    
    // We only try to send when hobs says that the game has begun!
    if (self.readyState == OPEN) {
    
      // If currently sending then put data into output queue
      // It will be handled when the current send is done...
      if (Session.sending == 1) {
        output_queue.push(data);
        
      // Do the actual sending
      } else {
        Session.sending = 1;
        q_send(data)
      }
    
    } else {
      // TODO: trigger onerror...
    }
  }
  
  self.close = function () {
    
    // No sense in closing a closed connection...
    if ((self.readyState == OPEN) || (self.readyState == CONNECTING)) {
      self.readyState = CLOSING;
      setTimeout(self.onclose, 0);
      self.readyState = CLOSED;
    }
  }

  // Helper for "instantiating" hubs.
  function connect () {
    
    self.readyState = CONNECTING;
    
    var xhr = createXHR();
    
    // Create the request-identifier offset
    Session.request_id = generate_rid();
    
    xhr.open('GET', self.url+'/hobs/create/'+Session.request_id+'/'+Session.wait);
    
    xhr.onreadystatechange = function(event) {
                        
      if (xhr.readyState == 4) {
        
        // Successful handshake
        if (xhr.status == 200) {
          
          // Grab headers and update session information
          
          Session.id = xhr.responseText;
          $('#messages').append('[SID='+Session.id+']');
          
          self.readyState = OPEN;
          setTimeout(self.onopen, 0);
          setTimeout(recvLoop, 0);
          
        } else {
          self.readyState = CLOSED;
        }
        
      }
      
    }
    xhr.send();
    
  }
  
  function generate_rid() {
    return Math.ceil(Math.random() * 10000000000);
  }
  
  // Helper for outgoing data, used by send()
  function q_send(data) {
  
    Session.request_id += 1;
    
    var xhr = createXHR();
    
    xhr.open('POST', self.url+'/hobs/session/'+Session.id+'/'+Session.request_id);
    xhr.setRequestHeader("Content-Type", "text/plain");
    
    xhr.onreadystatechange = function(event) {
            
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {          
          
          // Check if more stuff has arrived... can I do this here?? hmmm
          if (output_queue.length>0) {
            var more_data = '';
            for(var i=0; i<output_queue.length; i++) {
              more_data += output_queue.shift();
            }
            q_send(more_data);
          } else {
            Session.sending = 0;
          }
        
        // Something went wrong so the connection will be closed
        } else {
          self.close();
        }
      }
      
    }
    xhr.send(data);
    
  }
  
  // Helper for maintaining incoming data, used by connect
  function recvLoop() {
    
    var xhr = createXHR();  
    
    Session.request_id += 1;
    
    xhr.open('GET', self.url+'/hobs/session/'+Session.id+'/'+Session.request_id);
    xhr.onreadystatechange = function(event) {
      
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
          
          // TODO: don't trigger onmessage with keep-alive
          input_queue.push(xhr.responseText);
          setTimeout(self.onmessage, 0, {data: xhr.responseText} );
          
          // Should I do it again?
          if (self.readyState == OPEN) {
            setTimeout(recvLoop, 0);
          } else {
            self.close();
          }
        
        // Something went wrong so the connection will be closed
        } else {
          self.close();
        }
      }
      
    }
    
    xhr.send();
  
  }
  
}
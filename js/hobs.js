// Hobs provides a simple websocket-compatible interface
// for bidrectional communication in javacript.
//
// It utilizes websockets if available and falls back to utilizing
// XmlHTTPRequest in a way similar to the
// "BOSH Technique" (http://xmpp.org/extensions/xep-0124.html#technique).
//
// Hobs is named as an anagram after BOSH since it is inspired by the
// the technique, it is however not a bosh-implementation... it does not
// (among other things) provide xml payloads... it is different...
// smaller... almost hobbit-like...

// Hobs / Websocket interface

// Ready-states
var CONNECTING  = 0;
var OPEN        = 1;
var CLOSING     = 2;
var CLOSED      = 3;

Hobs = {};
Hobs.url = '';                      // readonly attribute DOMString
Hobs.readyState = null;             // readonly attribute unsigned short
Hobs.bufferedAmount = null;         // readonly attribute unsigned long

// Networking
Hobs.onopen    = function () {};    // attribute Function
Hobs.onmessage = function () {};    // attribute Function
Hobs.onclose   = function () {};    // attribute Function

Hobs.close  = function () {};
Hobs.send   = function send(data) {};

/*
  Implementation of the interface above
*/
Hobs.Session    = { id: 0, request_id: 0, running: false, sending: 0 };
Hobs.Info       = { protocol: 'http', host: 'wstest.local', port:'8080'};

Hobs.input_queue  = new Array();
Hobs.output_queue = new Array();

function q_send(data) {
  
  Hobs.Session.id += 1;
  Hobs.Session.request_id += 1;
  
  var xhr = createXHR();
  
  xhr.open('POST', Hobs.Info.protocol+'://'+Hobs.Info.host+':'+Hobs.Info.port+'/session/'+Hobs.Session.id+'/'+Hobs.Session.request_id);
  xhr.setRequestHeader("Content-Type", "text/plain");

  xhr.onreadystatechange = function(event) {
          
    if (xhr.readyState == 4) {
      
      if (xhr.status == 200) {          
        
        // Check if more stuff has arrived... can I do this here?? hmmm
        if (Hobs.output_queue.length>0) {
          var more_data = '';
          for(var i=0; i<Hobs.output_queue.length; i++) {
            more_data += Hobs.output_queue.pop();
          }
          q_send(more_data);
        } else {
          Hobs.Session.sending = 0;
        }
      
      // Something went wrong so the connection will be closed
      } else {
        Hobs.close();
      }
    }
    
  }
  xhr.send(data);
}

// Should check if there is currently a send in progress and queue the send
// in that case
Hobs.send = function (data, check) {
    
  // If currently sending then put data into output queue
  // It will be handled when the current send is done...
  if (Hobs.Session.sending == 1) {
    Hobs.output_queue.push(data);
    
  // Do the actual sending
  } else {
    Hobs.Session.sending = 1;
    q_send(data)
    
  }
    
}

Hobs.close = function () {
  Hobs.readyState = CLOSING;
  setTimeout(Hobs.onclose, 0);
  Hobs.readyState = CLOSED;
}

Hobs.onmessage = function (data) {
  $('#messages').append('['+data+']')
}

Hobs.connect = function (protocol, host, port) {
  
  Hobs.readyState = CONNECTING;
  
  var xhr = createXHR();
  
  Hobs.Session.id += 1;
  Hobs.Session.request_id += 1;
  
  xhr.open('GET', Hobs.Info.protocol+'://'+Hobs.Info.host+':'+Hobs.Info.port+'/connect/'+Hobs.Session.id+'/'+Hobs.Session.request_id);
  xhr.onreadystatechange = function(event) {
                      
    if (xhr.readyState == 4) {
      
      // Successful handshake
      if (xhr.status == 200) {
        
        Hobs.readyState = OPEN;
        setTimeout(Hobs.onopen, 0);
        setTimeout(recvLoop, 0);
        
      } else {
        Hobs.readyState = CLOSED;
      }      
      
    }
    
  }
  xhr.send();
  
}

function recvLoop() {
  
  var xhr = createXHR();  
  //var req_body  = '';
  //var req_type  = 'GET';
  
  Hobs.Session.id += 1;
  Hobs.Session.request_id += 1;
  
  //// Piggyback data from send-queue
  //if (Hobs.output_queue.length>0) {
  //  Hobs.Session.sending = 1;
  //  for(var i=0; i< Hobs.output_queue.length; i++) {
  //    req_body += Hobs.output_queue.pop();
  //  }
  //  req_type = 'POST';
  //}
  xhr.open('GET', Hobs.Info.protocol+'://'+Hobs.Info.host+':'+Hobs.Info.port+'/session/'+Hobs.Session.id+'/'+Hobs.Session.request_id);
  //xhr.open(req_type, Hobs.Info.protocol+'://'+Hobs.Info.host+':'+Hobs.Info.port+'/session/'+Hobs.Session.id+'/'+Hobs.Session.request_id);
  //if (req_type == 'POST') {
  //  xhr.setRequestHeader("Content-Type", "text/plain");
  //}
  xhr.onreadystatechange = function(event) {
    
    $('#messages').append('[state='+xhr.readyState+']');
    
    if (xhr.readyState == 4) {
      
      if (xhr.status == 200) {
        Hobs.input_queue.push(xhr.responseText);
        setTimeout(Hobs.onmessage, 0, xhr.responseText);
        
        // Should I do it again?
        if (Hobs.readyState == OPEN) {
          setTimeout(recvLoop, 0);
        } else {
          Hobs.close();
        }
      
      // Something went wrong so the connection will be closed
      } else {
        Hobs.close();
      }
    }
    
  }
  
  xhr.send();
  //xhr.send(req_body);
  //if (req_type == 'POST') {
  //  Hobs.Session.sending = 0;
  //}

}

// Utility section
var createXHR = function () {
    try { return new XMLHttpRequest(); } catch(e) {}
    try { return new ActiveXObject('MSXML3.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('MSXML2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    throw new Error('Could not find XMLHttpRequest or an alternative.');
};
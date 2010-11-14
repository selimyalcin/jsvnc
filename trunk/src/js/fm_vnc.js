// Fault-Mitigating VNC
// Wraps around VNC and handles disconnections.
function FMVnc(o) {
        
    var self = this;
    
    var nodes   = o.nodes;
    var ns      = o.ns;
    var n       = o.n;
    
    var nodes = new Array(        
        {'host': 'mifcho01', 'port': '8001'},
        {'host': 'mifcho02', 'port': '8002'},
        {'host': 'mifcho03', 'port': '8003'},
        {'host': 'mifcho04', 'port': '8004'},
        {'host': 'mifcho05', 'port': '8005'}
    );
    var ns  = 5;
    var n   = 0;
    
    var vnc = null;
    
    var attempt_reconnect       = true;
    var reconnection_attempts   = 0;
    var max_attempts = 0;
    
    function wrap_vnc() {
        
        vnc = new Vnc({
            vnc_host: $('#vnc_host').val(),
            vnc_port: $('#vnc_port').val(),
            ws_host:  nodes[n%ns].host,
            ws_port:  nodes[n%ns].port,
            ws_peerid: '2222'
        });
        self.state          = vnc.state;
        self.ctx            = vnc.ctx;
        self.server_info    = vnc.server_info;
        self.overlay_text   = vnc.overlay_text;
        vnc.onstatechange   = self.proxied_onstatechange;
        
    }
    
    self.log = function (msg) {
        var date = new Date();
        document.getElementById("log").innerHTML = date.getHours()+':'+date.getMinutes()+':'+date.getSeconds()+','+date.getMilliseconds()+' FM - '+msg+'\n' +document.getElementById("log").innerHTML;        
    }
    
    self.connect = function () {
        self.attempt_reconnect = true;
        vnc.connect();
    }
        
    self.disconnect = function () {
        self.attempt_reconnect = false;
        vnc.disconnect();        
    }
    
    self.onstatechange  = function (state) {}
    
    self.proxied_onstatechange = function (state) {
        
        if (state == 0) {
            setTimeout(self.onstatechange, 0, state);
            
        } else if ((state > 0) && (state < 100)) {
            setTimeout(self.onstatechange, 0, state);
            
        } else if ((state >= 100) && (state <200)) {
            setTimeout(self.onstatechange, 0, state);
            
        } else if ((state >= 200) && (state < 300)) {
            setTimeout(self.onstatechange, 0, state);
    
        } else if (state == 300) {
            
            // do not propagate
            vnc.disconnect();
            if (self.attempt_reconnect) {
                self.log('Attempting to reconnect... '+reconnection_attempts);
                reconnection_attempts = attempt_reconnect + 1;
                n = n + 1;
                wrap_vnc();
                setTimeout(vnc.connect, 1000);
            } else {
                setTimeout(self.onstatechange, 0, state);
            }

        } else {
            
            setTimeout(self.onstatechange, 0, state);
            
        }
        
    }
    
    wrap_vnc();
    

}
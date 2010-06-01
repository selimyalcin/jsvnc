#!/usr/bin/python
import sys
import os
import time
#from collections import deque
import cPickle as pickle
from optparse import OptionParser

# Change path so we find Xlib
sys.path.insert(1, os.path.join(sys.path[0], '..'))

from Xlib import X, XK, display
from Xlib.ext import record
from Xlib.protocol import rq

def lookup_keysym(keysym):
    for name in dir(XK):
        if name[:3] == "XK_" and getattr(XK, name) == keysym:
            return name[3:]
    return "[%d]" % keysym

def record_callback(reply):
    if reply.category != record.FromServer:
        return
    if reply.client_swapped:
        print "* received swapped protocol data, cowardly ignored"
        return
    if not len(reply.data) or ord(reply.data[0]) < 2:
        # not an event
        return

    data = reply.data
    while len(data):
        event, data = rq.EventField(None).parse_binary_value(data, record_dpy.display, None, None)
        
        if event.type in [X.KeyPress, X.KeyRelease, X.ButtonPress, X.ButtonRelease, X.  MotionNotify]:
            
            se = {'type': event.type, 'x':0, 'y':0, 'button':0, 'key':0, 'pressed':False}
        
            if event.type in [X.KeyPress, X.KeyRelease]:
                pr = event.type == X.KeyPress and "Press" or "Release"
    
                keysym = local_dpy.keycode_to_keysym(event.detail, 0)
                se['key'] = event.detail
                
                if not keysym:
                    print "KeyCode%s" % pr, event.detail
                else:
                    print "KeyStr%s" % pr, lookup_keysym(keysym)
    
                if event.type == X.KeyPress and keysym == XK.XK_Escape:
                    local_dpy.record_disable_context(ctx)
                    local_dpy.flush()
                    return
            elif event.type == X.ButtonPress:
                print "ButtonPress", event.detail
                se['pressed'] = True
                se['button'] = event.detail
            elif event.type == X.ButtonRelease:
                print "ButtonRelease", event.detail
                se['button'] = event.detail
            elif event.type == X.MotionNotify:
                print "MotionNotify", event.root_x, event.root_y
                se['x'] = event.root_x
                se['y'] = event.root_y
                
            rec.append((time.time(), se))

if __name__ == "__main__":

    # Grab recording file from command-line
    parser = OptionParser()
    parser.add_option('-f', '--file', dest='rec_file', help="Path to input recording.", metavar="FILE", default='mouse_kb.rec')
    (options, args) = parser.parse_args()

    local_dpy = display.Display()
    record_dpy = display.Display()
    
    rec = [] # Event recording for later playback
    
    # Check if the extension is present
    if not record_dpy.has_extension("RECORD"):
        print "RECORD extension not found"
        sys.exit(1)
    r = record_dpy.record_get_version(0, 0)
    print "RECORD extension version %d.%d" % (r.major_version, r.minor_version)
    
    # Create a recording context; we only want key and mouse events
    ctx = record_dpy.record_create_context(
            0,
            [record.AllClients],
            [{
                    'core_requests': (0, 0),
                    'core_replies': (0, 0),
                    'ext_requests': (0, 0, 0, 0),
                    'ext_replies': (0, 0, 0, 0),
                    'delivered_events': (0, 0),
                    'device_events': (X.KeyPress, X.MotionNotify),
                    'errors': (0, 0),
                    'client_started': False,
                    'client_died': False,
            }])
    
    # Enable the context; this only returns after a call to record_disable_context,
    # while calling the callback function in the meantime
    record_dpy.record_enable_context(ctx, record_callback)
    
    # Finally free the context
    record_dpy.record_free_context(ctx)
    
    # Store the event recording
    fd = open(options.rec_file,'w')
    pickle.dump(rec, fd)

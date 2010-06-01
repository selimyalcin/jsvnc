#!/usr/bin/env python
import Xlib.display
import Xlib.ext.xtest
import time
import cPickle as pickle
from optparse import OptionParser
from cpu_mon import sample_cpu

if __name__ == "__main__":

  # Process samplers:
  ['vncviewer', 'chrome', 'firefox']
  cli_name = 'vncviewer'

  # Grab recording file from command-line
  parser = OptionParser()
  parser.add_option('-f', '--file', dest='rec_file', help="Path to input recording.", metavar="FILE", default='mouse_kb.rec')
  (options, args) = parser.parse_args()

  # Load recording  
  rec = pickle.load(open(options.rec_file, 'r'))

  # Initialize stuff
  display   = Xlib.display.Display()
  screen    = display.screen()
  root      = screen.root
  
  offset = 0
  t = rec[offset][0]
  for r in rec[offset:]: # Iterate through event-recording
    
      ct = r[0]
      se = r[1]
      
      snooze = ct-t # Sleep to simulate the event timing
      if snooze > 0:
          time.sleep(ct-t)
      t = ct
      
      # Re-enact the recorded event!
      if se['type'] == Xlib.X.MotionNotify:
        root.warp_pointer(se['x'], se['y'])
        
      elif se['type'] in [Xlib.X.ButtonPress, Xlib.X.ButtonRelease]:
        Xlib.ext.xtest.fake_input(display, se['type'], se['button'])
        
      elif se['type'] in [Xlib.X.KeyPress, Xlib.X.KeyRelease]:
        Xlib.ext.xtest.fake_input(display, se['type'], se['key'])

      print ct, sample_cpu(cli_name)
      display.sync()

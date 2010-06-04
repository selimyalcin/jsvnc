#!/usr/bin/python
import subprocess
import sys

def sample_cpu(pname):
  ps = subprocess.Popen(['ps', 'aux'], stdout=subprocess.PIPE).communicate()[0]
  processes = ps.split('\n')
  # this specifies the number of splits, so the splitted lines
  # will have (nfields+1) elements
  nfields = len(processes[0].split()) - 1
  cpu_total = 0.0
  mem_total = 0.0

  for row in processes[1:]:
    r = row.split(None, nfields)
    if len(row)>0 and pname in r[-1]:
      cpu_total += float(r[2])
      mem_total += float(r[3])

  return (cpu_total, mem_total)

if __name__ == "__main__":
  pname = sys.argv[1]
  print sample_cpu(pname)

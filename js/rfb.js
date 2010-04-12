// FramebufferUpdateRequest
function fbur(w, h) {
  
  var r =   num_to_u8(3);
      r +=  num_to_u8(0);
      r +=  num_to_u16(0);
      r +=  num_to_u16(0);
      r +=  num_to_u16(w);
      r +=  num_to_u16(h);
  
  return r;
}

function keyEvent(key, pressed) {
  
  var r =   num_to_u8(4);
      r +=  num_to_u8(pressed);
      r +=  num_to_u16(0); // padding
      r +=  num_to_u32(key);
  
  return r;
}

function pointerEvent(x, y, pressed) {
    
  var r =   num_to_u8(5);
      r +=  num_to_u8(pressed);
      r +=  num_to_u16(x);
      r +=  num_to_u16(y);
  
  return r;
}
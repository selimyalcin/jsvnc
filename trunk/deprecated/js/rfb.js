// requires socket.js

// Client to server messages

// 6.4.3 - FramebufferUpdateRequest
function fbur(w, h, inc) {
  
  var r =   num_to_u8(3);
      r +=  num_to_u8(inc);
      r +=  num_to_u16(0);
      r +=  num_to_u16(0);
      r +=  num_to_u16(w);
      r +=  num_to_u16(h);
  
  return r;
}

// 6.4.4 - KeyEvent
function keyEvent(key, pressed) {
  
  var r =   num_to_u8(4);
      r +=  num_to_u8(pressed);
      r +=  num_to_u16(0); // padding
      r +=  num_to_u32(key);
  
  return r;
}

// 6.4.5 - PointerEvent
function pointerEvent(x, y, pressed) {
    
  var r =   num_to_u8(5);
      r +=  num_to_u8(pressed);
      r +=  num_to_u16(x);
      r +=  num_to_u16(y);
  
  return r;
}

// 6.4.6 - ClientCutText
// TODO: implement

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
function draw_rectangle(r_x, r_y, w, h, pixel_array, ctx) {

// What it basicly does is to change the BGR representation to RGB....
// and ignore the alpha channel... it could probably be optimized with
// in-space operations instead calling getImageData...
  
  var r_buffer = ctx.getImageData(r_x, r_y, w, h);  // Get a rectangle buffer
  //var r_buffer = ctx.createImageData(w,h);
  log(pixel_array.length);
  
  //for(var x=0; x<w; x++) {                          
  //  for(var y=0; y<h; y++) {
  for(var i=0; i<(w*h*4);i+=4) {                    // Map BGR to RGB
                  
      r_buffer.data[i]   = u8_to_num(pixel_array[i+2]);     // Update pixels...
      r_buffer.data[i+1] = u8_to_num(pixel_array[i+1]);
      r_buffer.data[i+2] = u8_to_num(pixel_array[i]);
      r_buffer.data[i+3] = 255;                     // Ignore transparency...
      
      //r_buffer.data[i]   = pixel_array.data[i];   // Update pixels...
      //r_buffer.data[i+1] = pixel_array.data[i+1];
      //r_buffer.data[i+2] = pixel_array.data[i+2];
      //r_buffer.data[i+3] = 255;                     // Ignore transparency...
      
    
  }
  
  ctx.putImageData(r_buffer, r_x, r_y);                 // Draw it

}
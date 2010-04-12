// Could be fun to implement something like the python struct library...
// Anyway this is sufficient
function num_to_u8(w)   { return String.fromCharCode(w&255); };
function num_to_u16(w)  { return String.fromCharCode((w>>8)&255, w&255); };
function num_to_u32(w)  { return String.fromCharCode((w>>24)&255, (w>>16)&255, (w>>8)&255, w&255); };

function u8_to_num(w)               { return w.charCodeAt(0); };
function u16_to_num(w1, w2)         { return (w1.charCodeAt(0)<<8)  + w2.charCodeAt(0); };
function u32_to_num(w1, w2, w3, w4) { return (w1.charCodeAt(0)<<24) + (w2.charCodeAt(0)<<16)+(w3.charCodeAt(0)<<8)+w4.charCodeAt(0); }
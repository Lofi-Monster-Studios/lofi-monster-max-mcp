Max/MSP Object Reference — use these class names with max_create_object and batch_create_ui tools.

## UI Objects (for Figma import)
| Class         | Description                    |
|---------------|--------------------------------|
| live.panel    | Background panel/rectangle     |
| live.dial     | Rotary knob with value display |
| live.slider   | Vertical or horizontal slider  |
| live.toggle   | On/off toggle button           |
| live.button   | Momentary button               |
| live.menu     | Dropdown menu                  |
| live.numbox   | Number input box               |
| live.text     | Text display                   |
| live.tab      | Tab selector                   |
| comment       | Text label (non-interactive)   |

## DSP Objects
| Class    | Description              |
|----------|--------------------------|
| cycle~   | Sine oscillator          |
| phasor~  | Ramp/sawtooth oscillator |
| noise~   | White noise generator    |
| *~       | Signal multiply          |
| +~       | Signal add               |
| lores~   | Resonant lowpass filter  |
| svf~     | State-variable filter    |
| dac~     | Audio output             |
| adc~     | Audio input              |

## Utility Objects
| Class   | Description                        |
|---------|------------------------------------|
| js      | Legacy JavaScript object           |
| v8      | Modern V8 JavaScript object        |
| message | Message box                        |
| toggle  | Toggle switch                      |
| slider  | Slider                             |
| number  | Number box                         |
| print   | Print to Max console               |
| trigger | Trigger/order messages             |
| route   | Route messages by first element    |
| pack    | Pack multiple values into a list   |
| unpack  | Unpack a list into individual vals |

## Notes
- Use live.* classes for Max for Live device UIs
- DSP objects end with ~ (tilde) for audio-rate processing
- newdefault ignores width/height — always follow up with patching_rect

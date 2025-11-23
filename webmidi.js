
let midiAccess = null;
let bitwigPort = null;

const activeNotes = {};

function log(message) {
  const output = document.getElementById('output');
  output.textContent += message + '\r\n';
  output.scrollTop = output.scrollHeight;
  console.log(message);
}

function updateStatus() {
  const indicator = document.getElementById('statusIndicator');
  if (bitwigPort) {
    indicator.classList.add('active');
  } 
  else {
    indicator.classList.remove('active');
  }
}

async function initMIDI() {
  try {
    midiAccess = await navigator.requestMIDIAccess();
    log('✓ MIDI access granted');
  
    const outputs = midiAccess.outputs.values();
    log('Available MIDI outputs:');
    for (let output of outputs) {
      log(`  - ${output.name}`);
    }
    bitwigPort = await getBitwigPort(midiAccess);
    updateStatus();
    return midiAccess;
  } 
  catch (err) {
    log('✗ MIDI access denied: ' + err);
    updateStatus();
  }
}

async function getBitwigPort(midiAccess) {
  const outputs = midiAccess.outputs.values();
  for (let output of outputs) {
    if (output.name.includes('loopMIDI') || output.name.includes('IAC')) {
      log(`✓ Found virtual port: ${output.name}`);
      return output;
    }
  }
  log('✗ Virtual MIDI port not found. Create one and try again.');
  return null;
}

function sendNoteOn(output, pitch, velocity, channel = 0) {
  const status = 0x90 | channel;
  output.send([status, pitch, velocity]);
}

function sendNoteOff(output, pitch, channel = 0) {
  const status = 0x80 | channel;
  output.send([status, pitch, 0]);
}

function sendCC(output, controller, value, channel = 0) {
  const status = 0xB0 | channel;
  output.send([status, controller, value]);
}

function sendPitchBendRaw(output, value, channel = 0) {
  const status = 0xE0 | channel;
  const lsb = value & 0x7F;
  const msb = (value >> 7) & 0x7F;
  output.send([status, lsb, msb]);
}

// Single Note Tests

function testNoteOn() {
  if (!bitwigPort) {
    log('Port not initialized');
    return;
  }
  const channel = parseInt(document.getElementById('noteChannel').value);
  const pitch = parseInt(document.getElementById('notePitch').value);
  const velocity = parseInt(document.getElementById('noteVelocity').value);
  
  sendNoteOn(bitwigPort, pitch, velocity, channel);
  log(`→ Note On: pitch=${pitch}, velocity=${velocity}, channel=${channel}`);
}

function testNoteOff() {
  if (!bitwigPort) {
    log('Port not initialized');
    return;
  }
  const channel = parseInt(document.getElementById('noteChannel').value);
  const pitch = parseInt(document.getElementById('notePitch').value);
  
  sendNoteOff(bitwigPort, pitch, channel);
  log(`→ Note Off: pitch=${pitch}, channel=${channel}`);
}

function testNoteWithDuration() {
  if (!bitwigPort) {
    log('Port not initialized');
    return;
  }
  const channel = parseInt(document.getElementById('noteChannel').value);
  const pitch = parseInt(document.getElementById('notePitch').value);
  const velocity = parseInt(document.getElementById('noteVelocity').value);
  const duration = parseInt(document.getElementById('noteDuration').value);
  
  sendNoteOn(bitwigPort, pitch, velocity, channel);
  log(`→ Note On (${duration}ms): pitch=${pitch}, velocity=${velocity}, channel=${channel}`);
  
  setTimeout(() => {
    sendNoteOff(bitwigPort, pitch, channel);
    log(`→ Note Off: pitch=${pitch}, channel=${channel}`);
  }, duration);
}

// Sustain

function sendSustainOn() {
  if (!bitwigPort) {
    log('Port not initialized');
    return;
  }
  const channel = parseInt(document.getElementById('sustainChannel').value);
  sendCC(bitwigPort, 64, 127, channel);
  log(`→ Sustain ON (CC 64 = 127): channel=${channel}`);
}

function sendSustainOff() {
  if (!bitwigPort) {
    log('Port not initialized');
    return;
  }
  const channel = parseInt(document.getElementById('sustainChannel').value);
  sendCC(bitwigPort, 64, 0, channel);
  log(`→ Sustain OFF (CC 64 = 0): channel=${channel}`);
}

// Chords

const chordIntervals = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  maj9: [0, 4, 7, 14]
};

function playChord(chordType) {
  if (!bitwigPort) {
    log('Port not initialized');
    return;
  }
  
  const root = parseInt(document.getElementById('chordRoot').value);
  const channel = parseInt(document.getElementById('chordChannel').value);
  const velocity = parseInt(document.getElementById('chordVelocity').value);
  const intervals = chordIntervals[chordType];

  const notes = intervals.map(interval => root + interval).filter(n => n <= 127);
  
  notes.forEach(pitch => {
    sendNoteOn(bitwigPort, pitch, velocity, channel);
    activeNotes[`${channel}-${pitch}`] = true;
  });

  log(`→ Chord ${chordType.toUpperCase()}: root=${root}, notes=[${notes.join(', ')}], channel=${channel}`);
}

function releaseAllChordNotes() {
  if (!bitwigPort) {
    log('Port not initialized');
    return;
  }

  Object.keys(activeNotes).forEach(key => {
    const [channel, pitch] = key.split('-').map(Number);
    sendNoteOff(bitwigPort, pitch, channel);
    delete activeNotes[key];
  });

  log('→ Released all active notes');
}

// Transport

function sendPlay() {
  if (!bitwigPort) {
    log('Port not initialized');
    return;
  }
  bitwigPort.send([0xFA]);  // MIDI Start
  log('→ Transport: START');
}

function sendStop() {
  if (!bitwigPort) {
    log('Port not initialized');
    return;
  }
  bitwigPort.send([0xFC]);  // MIDI Stop
  log('→ Transport: STOP');
}

function sendContinue() {
  if (!bitwigPort) {
    log('Port not initialized');
    return;
  }
  bitwigPort.send([0xFB]);  // MIDI Continue
  log('→ Transport: CONTINUE');
}

// Custom CC

function sendCustomCC() {
  if (!bitwigPort) {
    log('Port not initialized');
    return;
  }
  const channel = parseInt(document.getElementById('ccChannel').value);
  const ccNumber = parseInt(document.getElementById('ccNumber').value);
  const ccValue = parseInt(document.getElementById('ccValue').value);
  
  sendCC(bitwigPort, ccNumber, ccValue, channel);
  log(`→ CC: num=${ccNumber}, value=${ccValue}, channel=${channel}`);
}

// Pitch Bend

function sendPitchBend() {
  if (!bitwigPort) {
    log('Port not initialized');
    return;
  }
  const channel = parseInt(document.getElementById('pbChannel').value);
  const value = parseInt(document.getElementById('pbValue').value);
  
  sendPitchBendRaw(bitwigPort, value, channel);
  log(`→ Pitch Bend: value=${value}, channel=${channel}`);
}

function resetPitchBend() {
  if (!bitwigPort) {
    log('Port not initialized');
    return;
  }
  const channel = parseInt(document.getElementById('pbChannel').value);
  sendPitchBendRaw(bitwigPort, 0, channel);
  log(`→ Pitch Bend Reset (center): channel=${channel}`);
}

function bendDemo() {
  if (!bitwigPort) {
    log('Port not initialized');
    return;
  }
  const channel = parseInt(document.getElementById('pbChannel').value);
  
  log('→ Pitch Bend sweep demo...');
  
  for (let i = 0; i <= 8; i++) {
    setTimeout(() => {
      const value = Math.round((i / 8) * 8192) - 4096;
      sendPitchBendRaw(bitwigPort, value, channel);
    }, i * 100);
  }
}

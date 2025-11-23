const { WebMidi } = window;

let selectedOutput = null;
let sequenceRunning = false;

function log(message) {
  const output = document.getElementById('output');
  output.textContent += message + '\r\n';
  output.scrollTop = output.scrollHeight;
  console.log(message);
}

function logSequence(message) {
  const display = document.getElementById('sequenceDisplay');
  const step = document.createElement('div');
  step.className = 'sequence-step';
  step.textContent = message;
  display.appendChild(step);
  display.scrollTop = display.scrollHeight;
}

function clearSequenceDisplay() {
  const display = document.getElementById('sequenceDisplay');
  display.innerHTML = '';
}

function updateStatus() {
  const indicator = document.getElementById('statusIndicator');
  if (selectedOutput) {
    indicator.classList.add('active');
  }
  else {
    indicator.classList.remove('active');
  }
}

async function initWebMIDI() {
  try {
    await WebMidi.enable();
    log('✓ WebMIDI enabled successfully');
    log(`WebMidi.js version: ${WebMidi.version}`);
    
    const outputSelect = document.getElementById('outputSelect');
    outputSelect.innerHTML = '';
    
    if (WebMidi.outputs.length === 0) {
      log('✗ No MIDI outputs found');
      outputSelect.innerHTML = '<option value="">No devices available</option>';
      return;
    }
    
    log('Available MIDI outputs:');
    WebMidi.outputs.forEach((output, index) => {
      log(`  ${index + 1}. ${output.name}`);
      const option = document.createElement('option');
      option.value = output.id;
      option.textContent = output.name;
      outputSelect.appendChild(option);
    });
    
    outputSelect.disabled = false;
    
    const firstOutput = WebMidi.outputs[0];
    selectedOutput = firstOutput;
    outputSelect.value = firstOutput.id;
    log(`✓ Selected: ${firstOutput.name}`);
    updateStatus();
  }
  catch (err) {
    log('✗ WebMIDI enable failed: ' + err.message);
    updateStatus();
  }
}

function selectOutput() {
  const outputSelect = document.getElementById('outputSelect');
  const outputId = outputSelect.value;
  
  if (!outputId) return;
  
  selectedOutput = WebMidi.getOutputById(outputId);
  log(`✓ Selected: ${selectedOutput.name}`);
  updateStatus();
}

// Chord definitions
const chordIntervals = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7]
};

function playChord(root, chordType, channel, velocity, duration) {
  if (!selectedOutput) {
    log('✗ No output selected');
    return;
  }
  
  const intervals = chordIntervals[chordType];
  const notes = intervals.map(interval => root + interval);
  
  notes.forEach(noteNumber => {
    selectedOutput.channels[channel].playNote(noteNumber, {
      duration: duration,
      attack: velocity
    });
  });
  
  return notes;
}

function playTestChord(chordType) {
  if (!selectedOutput) {
    log('✗ No output selected');
    return;
  }
  
  const root = parseInt(document.getElementById('testRoot').value);
  const channel = parseInt(document.getElementById('testChannel').value);
  const velocity = parseFloat(document.getElementById('testVelocity').value);
  const duration = parseInt(document.getElementById('testDuration').value);
  
  const notes = playChord(root, chordType, channel, velocity, duration);
  log(`→ ${chordType.toUpperCase()}: notes=[${notes.join(', ')}], ch=${channel}, vel=${velocity}, dur=${duration}ms`);
}

// Sequence Examples

async function playSimpleSequence() {
  if (!selectedOutput) {
    log('✗ No output selected');
    return;
  }
  
  clearSequenceDisplay();
  logSequence('Starting Seq');
  
  const root = 60; // C4
  const channel = 1;
  const velocity = 0.7;
  const duration = 800;
  const gap = 1000;
  
  // I - C Major
  logSequence('Bar 1: I (C Major)');
  playChord(root, 'major', channel, velocity, duration);
  
  await sleep(gap);
  
  // IV - F Major
  logSequence('Bar 2: IV (F Major)');
  playChord(root + 5, 'major', channel, velocity, duration);
  
  await sleep(gap);
  
  // V - G Major
  logSequence('Bar 3: V (G Major)');
  playChord(root + 7, 'major', channel, velocity, duration);
  
  await sleep(gap);
  
  // I - C Major
  logSequence('Bar 4: I (C Major)');
  playChord(root, 'major', channel, velocity, duration);
  
  logSequence('✓ Sequence complete');
}

async function playSimpleSequence2() {
  if (!selectedOutput) {
    log('✗ No output selected');
    return;
  }
  
  clearSequenceDisplay();
  logSequence('Starting Seq');
  
  const root = 60; // C4
  const channel = 1;
  const velocity = 0.75;
  const duration = 900;
  const gap = 1100;
  
  // ii - D minor 7
  logSequence('Bar 1: ii (Dm7)');
  playChord(root + 2, 'minor7', channel, velocity, duration);
  
  await sleep(gap);
  
  // V - G dominant 7
  logSequence('Bar 2: V (G7)');
  playChord(root + 7, 'dom7', channel, velocity, duration);
  
  await sleep(gap);
  
  // I - C Major 7
  logSequence('Bar 3: I (Cmaj7)');
  playChord(root, 'major7', channel, velocity, duration);
  
  logSequence('✓ Sequence complete');
}

async function playMultiChannelSequence() {
  if (!selectedOutput) {
    log('✗ No output selected');
    return;
  }
  
  clearSequenceDisplay();
  logSequence('Starting Multi-Channel Demo: Different chords on channels 1, 2, 3');
  
  const root = 48; // C3
  const duration = 1200;
  const gap = 1500;
  
  // Chord 1: Channel 1 - Low bass note
  logSequence('Ch1: C Major (bass)');
  playChord(root, 'major', 1, 0.9, duration);
  
  await sleep(gap);
  
  // Chord 2: Channel 2 - Mid range
  logSequence('Ch2: E Minor (mid)');
  playChord(root + 16, 'minor', 2, 0.7, duration);
  
  await sleep(gap);
  
  // Chord 3: Channel 3 - High range
  logSequence('Ch3: G Major (high)');
  playChord(root + 31, 'major', 3, 0.6, duration);
  
  await sleep(gap);
  
  // All together
  logSequence('All channels together!');
  playChord(root, 'major', 1, 0.8, duration);
  playChord(root + 16, 'minor', 2, 0.7, duration);
  playChord(root + 31, 'major', 3, 0.6, duration);
  
  logSequence('✓ Sequence complete');
}

async function playVelocityDemo() {
  if (!selectedOutput) {
    log('✗ No output selected');
    return;
  }
  
  clearSequenceDisplay();
  logSequence('Starting Velocity Variation Demo');
  
  const root = 60;
  const channel = 1;
  const duration = 600;
  const gap = 800;
  
  const velocities = [0.3, 0.5, 0.7, 0.9];
  const velocityLabels = ['pp (soft)', 'mp (medium-soft)', 'mf (medium-loud)', 'ff (loud)'];
  
  for (let i = 0; i < velocities.length; i++) {
    logSequence(`C Major @ velocity ${velocities[i]} - ${velocityLabels[i]}`);
    playChord(root, 'major', channel, velocities[i], duration);
    await sleep(gap);
  }
  
  logSequence('✓ Sequence complete');
}

function stopAllNotes() {
  if (!selectedOutput) {
    log('✗ No output selected');
    return;
  }
  
  for (let i = 1; i <= 16; i++) {
    selectedOutput.channels[i].sendAllNotesOff();
  }
  
  log('→ All notes off (all channels)');
  logSequence('⏹ Stopped all notes');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
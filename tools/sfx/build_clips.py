# Sound build, step 1 of 2. The source packs are not in the repo (kept locally under /home/user/sfx-in);
# run this, then tools/sfx/make_sprites.py <clips folder>, to rebuild art/sfx and src/ui/sfx-sprites.js.
"""Turn the supplied sound packs into small, level-matched game files in art/sfx/.

Each entry: output name -> (source, start, max_len, kind)
kind: 'sfx' (mono, -16 LUFS, fades), 'voice' (mono, -16 LUFS), 'amb' (stereo loop, -24 LUFS).
start=None means "start at the first non-silent moment".
"""
import json, os, subprocess, sys

S = '/home/user/sfx-in'
H = S + '/horror3mp3/Horror Sounds Vol 3 - The Companion Piece - 150 MP3/'
C = S + '/cosmic/Cosmic Horror/'
R = S + '/robots/'
P = S + '/spells/Spells/'
M = S + '/single/'
V = S + '/voices/'
D = S + '/death/8 - Death/'
OUT = '/home/user/sfx-clips/'

J = {}
def add(name, src, start=None, max_len=2.0, kind='sfx'):
    J[name] = (src, start, max_len, kind)

# ---- spells (generic and by element)
for i in (1, 2, 3): add(f'spell-impact-{i}', P + f'Spell Impact {i}.wav', max_len=1.6)
for i in (1, 2, 3): add(f'fireball-{i}', P + f'Fireball {i}.wav', max_len=1.8)
for i in (1, 2): add(f'ice-throw-{i}', P + f'Ice Throw {i}.wav', max_len=1.6)
for i in (1, 2): add(f'ice-freeze-{i}', P + f'Ice Freeze {i}.wav', max_len=1.8)
for i in (1, 2): add(f'ice-wall-{i}', P + f'Ice Wall {i}.wav', max_len=1.6)
for i in (1, 2): add(f'wave-{i}', P + f'Wave Attack {i}.wav', max_len=1.8)
for i in (1, 2): add(f'waterspray-{i}', P + f'Waterspray {i}.wav', max_len=1.4)
for i in (1, 2): add(f'rock-wall-{i}', P + f'Rock Wall {i}.wav', max_len=1.5)
for i in (1, 2): add(f'meteor-{i}', P + f'Rock Meteor Throw {i}.wav', max_len=2.0)
for i in (1, 2): add(f'meteor-swarm-{i}', P + f'Rock Meteor Swarm {i}.wav', max_len=3.5)
for i in (1, 2): add(f'firebuff-{i}', P + f'Firebuff {i}.wav', max_len=1.6)

# ---- realm "arrives" sounds
add('bat-1', H + 'Bat Flying inbound.mp3', max_len=1.6)
add('bat-2', H + 'Bat, Night Flyby.mp3', max_len=1.6)
add('bat-chatter', H + 'Bat, Disturbed Chatter.mp3', max_len=1.4)
add('zombie-rise-1', H + 'Zombie, Rising Call, Ragged.mp3', max_len=1.8)
add('zombie-rise-2', H + 'Zombie, Moan Neutral.mp3', max_len=1.8)
add('zombie-pain', H + 'Zombie, Pained Moan.mp3', max_len=1.6)
add('zombie-fall', H + 'Zombie, Subdued Falling Moan.mp3', max_len=1.8)
add('feral-1', H + 'Growl, Feral, Single.mp3', max_len=1.5)
add('feral-2', H + 'Growl, Beast, Charge.mp3', max_len=1.6)
add('beast-moan', H + 'Growl, Beast, Passive moan.mp3', max_len=1.6)
add('beast-breath', H + 'Growl, massive Beast breathing.mp3', max_len=2.0)
add('beast-snarl', H + 'Growling, feral Beast snarl.mp3', max_len=1.6)
add('beast-obstacle', H + 'Growl, Beast snarl at obstacle.mp3', max_len=1.6)
add('deep-growl', H + 'Growl, Deep Buildup.mp3', max_len=2.0)
add('deep-fall', H + 'Growl, deep menacing and falling.mp3', max_len=2.0)
add('dragon-screech', H + 'Sreech, Giant Beast overhead, Deep and Loud - Dragon.mp3', max_len=2.4)
add('ghost-whisper', H + 'Ghost - Backwards Whisper.mp3', max_len=2.0)
add('ghost-passby', H + 'Screech, Haunting, Passby.mp3', max_len=1.8)
add('ghost-fade', H + 'Screech, Long, Fading into Distance.mp3', max_len=2.2)
add('banshee', H + 'SCreech, Humanoid Banshe Wail.mp3', max_len=2.2)
add('creature-cries', H + 'Creature, Lashing Out Cries.mp3', max_len=1.6)
add('humanoid-hostile', H + 'Growl, Humanoid Male Hostile.mp3', max_len=1.6)
add('humanoid-snarl', H + 'Growl, Snarling humanoid.mp3', max_len=1.6)
add('humanoid-moan', H + 'Growl, Humanoid Moan.mp3', max_len=1.6)
add('squish', H + 'Squishing.mp3', max_len=1.2)
add('implosion', H + 'Implosion - Organic Being.mp3', max_len=1.6)
add('maggots', H + 'Maggots Churning in Carrion.mp3', start=0.5, max_len=1.4)
add('bones', H + 'Bones - Crushing and Breaking Open.mp3', max_len=1.2)
add('knife', H + 'Knife Slashing against Solid TArget.mp3', max_len=0.9)
add('hell-boom', H + 'Scene, Introduction to Hell - Synthetic Booming.mp3', start=0.01, max_len=3.0)
add('single-boom', H + 'Scene, Introduction, Single Broooom.mp3', start=0.01, max_len=3.0)
add('device-on', H + 'Electric Device Startup.mp3', max_len=1.4)
add('sizzle', H + 'Scene, Sizzling Electronic Wires or welding - Loopable.mp3', start=0.3, max_len=1.2)
add('mech-step', R + 'heavy-mech-metal-step-2.wav', max_len=1.5)
add('mech-knee', R + 'knee-actuator-clunk-1.wav', max_len=0.9)
add('mech-mast', R + 'sensor-mast-raise-1.wav', max_len=0.8)
add('mech-spark', R + 'exposed-circuit-spark-2.wav', max_len=1.0)
add('mech-sad', R + 'robot-sad-tone-1.wav', max_len=0.9)
add('mech-rivet', R + 'pneumatic-rivet-strike-1.wav', max_len=0.9)
add('mech-stall', R + 'servo-motor-stall-2.wav', max_len=1.4)
add('void-1', C + 'CosmicHorror_SpaceDecay1.mp3', max_len=2.6)
add('void-2', C + 'CosmicHorror_SpaceDecay2.mp3', max_len=2.6)
add('cosmic-rumble', C + 'CosmicHorror_Rumble2.mp3', max_len=3.0)
add('monster-low-5', M + 'Monster_Voice_low_5_planarian_BGM.wav', max_len=2.2)
add('monster-low-7', M + 'monster_voice_low_7_planarian_BGM.wav', max_len=2.4)
add('monster-high', M + 'monster_voice_high_5_planarian_bgm.wav', max_len=2.2)
add('witch', M + 'monster_voice_witch_planarian_bgm.wav', max_len=2.6)
add('spirits', M + 'Voice_of_the_Spirits__planarian_BGM_.wav', max_len=2.6)

# ---- Bees (a full creature set)
E = S + '/extra/'
add('bee-idle', E + 'idle_3.wav', max_len=2.0)
add('bee-fly-1', E + 'flying_sound_4.wav', max_len=1.8)
add('bee-fly-2', E + 'flying_sound_5.wav', max_len=1.8)
add('bee-alarm-1', E + 'alarmed_2.wav', max_len=1.6)
add('bee-alarm-2', E + 'alarmed_3.wav', max_len=1.6)
add('bee-alarm-3', E + 'alarmed_4.wav', max_len=1.6)
add('bee-attack', E + 'attack_sound_2.wav', max_len=1.4)
add('bee-hurt-1', E + 'damage_sound_1.wav', max_len=1.1)
add('bee-hurt-2', E + 'damage_sound_2.wav', max_len=1.1)
add('bee-hurt-3', E + 'damage_sound_4.wav', max_len=1.1)

# ---- ambience loops (very quiet, behind the music)
add('amb-crickets', H + 'Scene, Night time Nature with Crickets - Loopable.mp3', start=0, max_len=90, kind='amb')
add('amb-underground', H + 'Scene, Dark Underground, Background - Loopable.mp3', start=0, max_len=90, kind='amb')
add('amb-fire', H + 'Scene, A City Aflame - Loopable.mp3', start=0, max_len=90, kind='amb')
add('amb-factory', H + 'Factory Floor During Operation - Loopable.mp3', start=0, max_len=90, kind='amb')
add('amb-cosmic', C + 'CosmicHorror_RumbleLoop1.mp3', start=0, max_len=90, kind='amb')

# ---- hero voices: every file of the five actors' Greeting, Refusal, Confirmation and Death sets
ACTORS = {'alex': 'Male/Alex Brodie', 'ian': 'Male/Ian Lampert', 'sean': 'Male/Sean Lenhart',
          'karen': 'Female/Karen Cenon', 'meghan': 'Female/Meghan Christian'}
SETS = {'greet': ('3_-_Greeting', '3 - Greeting', 'greeting'), 'no': ('5_-_Refusal', '5 - Refusal', 'refusal'),
        'yes': ('2_-_Confirmation', '2 - Confirmation', 'confirmation')}
ZIPDIR = {'greet': 'dbeae280-3_-_Greeting', 'no': 'de61ad83-5_-_Refusal', 'yes': '15220d8b-2_-_Confirmation'}
for kind, (_, folder, stem) in SETS.items():
    for actor, sub in ACTORS.items():
        d = f'{V}{ZIPDIR[kind]}/{folder}/{sub}/'
        files = sorted(f for f in os.listdir(d) if f.endswith('.wav'))
        for i, f in enumerate(files, 1):
            add(f'v-{actor}-{kind}-{i}', d + f, max_len=3.0, kind='voice')
for actor, sub in ACTORS.items():
    d = f'{D}{sub}/'
    files = sorted(f for f in os.listdir(d) if f.endswith('.wav'))
    for i, f in enumerate(files, 1):
        add(f'v-{actor}-death-{i}', d + f, max_len=3.0, kind='voice')


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=40)
    if r.returncode != 0:
        raise SystemExit(r.stderr[-800:])
    return r


def build(name, src, start, max_len, kind):
    out = OUT + name + '.mp3'
    trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,' if start is None else ''
    fade = max(0.05, min(0.35, max_len * 0.18))
    if kind == 'amb':
        af = f'atrim=0:{max_len},loudnorm=I=-24:TP=-3:LRA=11'
        ch, br = '2', '96k'
    else:
        af = (f'{trim}atrim=0:{max_len},areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,'
              f'loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st={max_len - fade}:d={fade}')
        ch, br = '1', '80k'
    ss = ['-ss', str(start)] if start else []
    try:
        run(['ffmpeg', '-v', 'error', '-y', *ss, '-i', src, '-af', af, '-ac', ch, '-ar', '44100', '-b:a', br, out])
    except subprocess.TimeoutExpired:
        # A few files stall ffmpeg's trim-the-tail step: fall back to a plain trim + level + fade.
        simple = f'atrim=0:{max_len},loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st={max_len - fade}:d={fade}'
        run(['ffmpeg', '-v', 'error', '-y', *ss, '-i', src, '-af', simple, '-ac', ch, '-ar', '44100', '-b:a', br, out])
    dur = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).stdout)
    return dur


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    report = {}
    for name, (src, start, max_len, kind) in J.items():
        if only and name not in only:
            continue
        if not only and os.path.exists(OUT + name + '.mp3') and os.path.getsize(OUT + name + '.mp3') > 0:
            continue
        if not os.path.exists(src):
            raise SystemExit('missing ' + src)
        report[name] = round(build(name, src, start, max_len, kind), 2)
    total = sum(os.path.getsize(OUT + f) for f in os.listdir(OUT))
    print(json.dumps({'files': len(report), 'MB': round(total / 1e6, 2)}))
    short = {k: v for k, v in report.items() if v < 0.15}
    print('very short:', short)

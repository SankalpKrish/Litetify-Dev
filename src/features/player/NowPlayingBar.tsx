import { TransportControls } from './TransportControls';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { DeviceSelector } from './DeviceSelector';
import { NowPlayingInfo } from './NowPlayingInfo';
import { AutoQueueToggle } from './AutoQueueToggle';

export function NowPlayingBar() {
  return (
    <footer className="player-bar">
      <div className="player-bar-left">
        <NowPlayingInfo />
      </div>
      <div className="player-bar-center">
        <TransportControls />
        <ProgressBar />
      </div>
      <div className="player-bar-right">
        <AutoQueueToggle />
        <DeviceSelector />
        <VolumeControl />
      </div>
    </footer>
  );
}

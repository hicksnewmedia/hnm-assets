import { Config } from '@remotion/cli/config';

// PNG, not JPEG — JPEG has no alpha channel, and a JPEG intermediate would
// silently discard transparency, giving you a black box in the timeline.
Config.setVideoImageFormat('png');
Config.setOverwriteOutput(true);

import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('png'); // png, not jpeg — jpeg has no alpha channel
Config.setOverwriteOutput(true);

# Meet app

## Development Setup
This is a mono repo. In one terminal open the meet directory and run the server with `yarn start`. In a different terminal you can run `yarn build` to build the fe or `yarn build --watch` to have esbuild automatically rebuild when a file is changed.

## Testing videocalls locally
The best browsert to test locally a videocall is with Chrome. Locally one is able to use the `getUserMedia` with http://localhost:3000 but sometimes it may not work in some devices or browsers as `getUserMedia` is only available from secure contexts. If it's not working or you would like to try a videocall with another device you can set up a tunnel to map a public DNS address with SSL certificate to a port on your local machine (e.g. you can do this for free with ngrok.com)

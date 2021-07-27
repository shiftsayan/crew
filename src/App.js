import { Client } from 'boardgame.io/react';
import { Crew } from './Game';

const App = Client({ game: Crew });

export default App;
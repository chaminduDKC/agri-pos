import { Link } from 'react-router-dom'
import { DbTest } from '../components/DbTest'

export const Home = () => {
  return (
    <div>
        <h1>Home Screen</h1>
        <Link to="/about">
            <h6>Go to About</h6>
        </Link>
        <Link to="/paysheets">
            <h6>Go to Paysheets</h6>
        </Link>
        <Link to="/clients">Clients</Link>
        <div>
      <DbTest />
    </div>

    </div>
)
}

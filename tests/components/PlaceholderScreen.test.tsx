import { render, screen } from '@testing-library/react-native'

import { PlaceholderScreen } from '@/components/PlaceholderScreen'

describe('PlaceholderScreen', () => {
  it('renders the given label', async () => {
    await render(<PlaceholderScreen label="Leaderboard" />)

    expect(screen.getByText('Leaderboard')).toBeTruthy()
  })
})

import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './button';

describe('Button', () => {
  it('зовёт onPress по нажатию', async () => {
    const onPress = jest.fn();
    await render(<Button label="Загрузить" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Загрузить' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('выключённая кнопка не нажимается', async () => {
    const onPress = jest.fn();
    await render(<Button label="Загрузить" onPress={onPress} disabled />);

    fireEvent.press(screen.getByRole('button', { name: 'Загрузить' }));

    expect(onPress).not.toHaveBeenCalled();
  });
});

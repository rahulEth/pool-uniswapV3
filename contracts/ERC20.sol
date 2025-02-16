// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract FixedERC20 is ERC20{
    uint8 private immutable _decimals;
    uint256 private immutable _totalSupply;
    constructor(string memory name_, string memory symbol_, uint256 totalSupply_, uint8 decimals_) 
        ERC20(name_, symbol_){
        _decimals = decimals_;    
        _totalSupply = totalSupply_ * (decimals_ ** 10);  
        _mint(msg.sender, _totalSupply);
    }

    function decimals() public view override returns (uint8){
        _decimals;
    } 
}

